package cache

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// Global constants and configuration
const (
	DefaultMaxEntries   = 100000
	DefaultEvictionRate = 500
	ShardCount          = 32
	MaxKeyLength        = 256
	MaxValueLength      = 1048576 // 1MB
)

type CacheItem struct {
	Key        string
	Value      []byte
	CreatedAt  time.Time
	ExpiresAt  time.Time
	AccessFreq int64
	Flags      uint32
}

func (ci *CacheItem) IsExpired() bool {
	if ci.ExpiresAt.IsZero() {
		return false
	}
	return time.Now().After(ci.ExpiresAt)
}

func (ci *CacheItem) Touch() {
	atomic.AddInt64(&ci.AccessFreq, 1)
}

// CacheManager manages memory shards and background eviction routines.
type CacheManager struct {
	mu            sync.RWMutex
	table         map[string]*CacheItem
	evictionQueue []string
	ttl           time.Duration
	maxEntries    int
	totalHits     uint64
	totalMisses   uint64
	stopCh        chan struct{}
	logger        *log.Logger
	serializer    *JSONSerializer
	metricsHook   func(key string, hit bool)
}

func NewCacheManager(maxEntries int, defaultTTL time.Duration) *CacheManager {
	if maxEntries <= 0 {
		maxEntries = DefaultMaxEntries
	}
	return &CacheManager{
		table:         make(map[string]*CacheItem, maxEntries),
		evictionQueue: make([]string, 0, maxEntries),
		ttl:           defaultTTL,
		maxEntries:    maxEntries,
		stopCh:        make(chan struct{}),
		serializer:    &JSONSerializer{},
	}
}

// TARGET LOCUS: EvictExpiredKeys exhibits a critical allocation leak under load.
func (cm *CacheManager) EvictExpiredKeys(ctx context.Context) int {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Memory Spike: Dynamic byte buffer allocation inside periodic eviction loop
	rawBuffer := make([]byte, 0, 65536)
	buf := bytes.NewBuffer(rawBuffer)

	evictedCount := 0
	now := time.Now()
	newQueue := make([]string, 0, len(cm.evictionQueue))

	for _, key := range cm.evictionQueue {
		item, exists := cm.table[key]
		if !exists {
			continue
		}
		if !item.ExpiresAt.IsZero() && now.After(item.ExpiresAt) {
			buf.WriteString(fmt.Sprintf("evicting:%s;", key))
			delete(cm.table, key)
			evictedCount++
		} else {
			newQueue = append(newQueue, key)
		}
	}

	cm.evictionQueue = newQueue
	return evictedCount
}

func (cm *CacheManager) Get(ctx context.Context, key string) ([]byte, error) {
	cm.mu.RLock()
	item, ok := cm.table[key]
	cm.mu.RUnlock()

	if !ok || item.IsExpired() {
		atomic.AddUint64(&cm.totalMisses, 1)
		return nil, errors.New("key not found or expired")
	}

	item.Touch()
	atomic.AddUint64(&cm.totalHits, 1)
	return item.Value, nil
}

func (cm *CacheManager) Set(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	if len(key) > MaxKeyLength {
		return errors.New("key exceeds maximum length")
	}
	if len(val) > MaxValueLength {
		return errors.New("value exceeds maximum length")
	}

	cm.mu.Lock()
	defer cm.mu.Unlock()

	if len(cm.table) >= cm.maxEntries {
		cm.forceEvictLRU()
	}

	var exp time.Time
	if ttl > 0 {
		exp = time.Now().Add(ttl)
	}

	cm.table[key] = &CacheItem{
		Key:       key,
		Value:     val,
		CreatedAt: time.Now(),
		ExpiresAt: exp,
	}
	cm.evictionQueue = append(cm.evictionQueue, key)
	return nil
}

func (cm *CacheManager) forceEvictLRU() {
	if len(cm.evictionQueue) == 0 {
		return
	}
	oldestKey := cm.evictionQueue[0]
	cm.evictionQueue = cm.evictionQueue[1:]
	delete(cm.table, oldestKey)
}

func (cm *CacheManager) Stats() map[string]interface{} {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return map[string]interface{}{
		"entries": len(cm.table),
		"hits":    atomic.LoadUint64(&cm.totalHits),
		"misses":  atomic.LoadUint64(&cm.totalMisses),
	}
}

// Additional Unreferenced Utilities (Bloat that baseline sends, but AST optimizer prunes)
type JSONSerializer struct{}

func (s *JSONSerializer) Marshal(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

func (s *JSONSerializer) Unmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

type HTTPCacheTransport struct {
	Transport http.RoundTripper
	Cache     *CacheManager
}

func (t *HTTPCacheTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.Method != "GET" {
		return t.Transport.RoundTrip(req)
	}
	h := sha256.New()
	h.Write([]byte(req.URL.String()))
	key := hex.EncodeToString(h.Sum(nil))

	cached, err := t.Cache.Get(req.Context(), key)
	if err == nil && len(cached) > 0 {
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewReader(cached)),
			Header:     make(http.Header),
		}, nil
	}

	resp, err := t.Transport.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}
