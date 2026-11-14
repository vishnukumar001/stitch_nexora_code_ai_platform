import os
import shutil
import tempfile
import unittest
from backend.app.services.sandbox_service import SandboxService, SandboxSecurityException

class TestSandboxSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp(prefix="nexora_sec_test_")
        cls.sandbox_path = os.path.join(cls.test_dir, "test_sandbox")
        os.makedirs(cls.sandbox_path, exist_ok=True)

        # Create nested directory inside sandbox
        os.makedirs(os.path.join(cls.sandbox_path, "pkg", "cache"), exist_ok=True)
        with open(os.path.join(cls.sandbox_path, "pkg", "cache", "cache_manager.py"), "w") as f:
            f.write("# valid cache manager\n")

        with open(os.path.join(cls.sandbox_path, "main.py"), "w") as f:
            f.write("# valid main file\n")

        # Create external directory and file to test escape protection
        cls.external_dir = os.path.join(cls.test_dir, "external_vault")
        os.makedirs(cls.external_dir, exist_ok=True)
        cls.external_secret = os.path.join(cls.external_dir, "secret.key")
        with open(cls.external_secret, "w") as f:
            f.write("SUPER_SECRET_EXTERNAL_KEY\n")

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_dir):
            shutil.rmtree(cls.test_dir, ignore_errors=True)

    def test_01_normal_relative_path(self):
        """Test Case 1: Normal relative path inside sandbox must be accepted and resolved."""
        resolved = SandboxService.validate_safe_path(self.sandbox_path, "main.py")
        expected = os.path.realpath(os.path.join(self.sandbox_path, "main.py"))
        self.assertEqual(resolved, expected)

    def test_02_parent_directory_traversal(self):
        """Test Case 2: Parent directory traversal (../) must be strictly rejected."""
        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "../outside.txt")
        self.assertIn("Security Violation", str(ctx.exception))

        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "../../etc/passwd")
        self.assertIn("Security Violation", str(ctx.exception))

    def test_03_absolute_external_path(self):
        """Test Case 3: Absolute external path must be strictly rejected."""
        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "/etc/passwd")
        self.assertIn("Security Violation", str(ctx.exception))

        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, self.external_secret)
        self.assertIn("Security Violation", str(ctx.exception))

    def test_04_nested_directory_traversal(self):
        """Test Case 4: Deeply nested traversal attempts must be strictly rejected."""
        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "pkg/cache/../../../../external_vault/secret.key")
        self.assertIn("Security Violation", str(ctx.exception))

        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "pkg/../../../outside.py")
        self.assertIn("Security Violation", str(ctx.exception))

    def test_05_symlink_escape(self):
        """Test Case 5: Symlink pointing outside the sandbox must be strictly rejected."""
        symlink_dir = os.path.join(self.sandbox_path, "vault_symlink")
        if not os.path.exists(symlink_dir):
            os.symlink(self.external_dir, symlink_dir)

        # Attempting to access file through symlink pointing outside
        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "vault_symlink/secret.key")
        self.assertIn("Security Violation", str(ctx.exception))

        # Direct symlink to an external file
        symlink_file = os.path.join(self.sandbox_path, "secret_symlink.key")
        if not os.path.exists(symlink_file):
            os.symlink(self.external_secret, symlink_file)

        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.validate_safe_path(self.sandbox_path, "secret_symlink.key")
        self.assertIn("Security Violation", str(ctx.exception))

    def test_06_valid_nested_sandbox_file(self):
        """Test Case 6: Valid nested file path inside sandbox must be accepted and resolved."""
        resolved = SandboxService.validate_safe_path(self.sandbox_path, "pkg/cache/cache_manager.py")
        expected = os.path.realpath(os.path.join(self.sandbox_path, "pkg/cache/cache_manager.py"))
        self.assertEqual(resolved, expected)

        # Also test non-existent valid nested file inside sandbox
        resolved_new = SandboxService.validate_safe_path(self.sandbox_path, "pkg/new_feature/optimizer.py")
        expected_new = os.path.realpath(os.path.join(self.sandbox_path, "pkg/new_feature/optimizer.py"))
        self.assertEqual(resolved_new, expected_new)

    def test_07_patch_application_cannot_modify_outside(self):
        """Test Case 7: Patch application must never modify files outside the sandbox."""
        external_target = os.path.join(self.external_dir, "untouchable.py")
        with open(external_target, "w") as f:
            f.write("# Original external content\n")

        with self.assertRaises(SandboxSecurityException):
            SandboxService.apply_patch_and_test(
                sandbox_id="sec-test-sbx",
                repo_id="repo-core",
                target_file="../../external_vault/untouchable.py",
                diff_text="MALICIOUS_OVERWRITE"
            )

        # Verify external file remained untouched
        with open(external_target, "r") as f:
            self.assertEqual(f.read(), "# Original external content\n")

    def test_08_invalid_sandbox_id_traversal(self):
        """Test Case 8: Sandbox ID cannot attempt directory traversal."""
        with self.assertRaises(SandboxSecurityException) as ctx:
            SandboxService.get_or_create_sandbox("../escape_sandbox")
        self.assertIn("Invalid sandbox identifier", str(ctx.exception))

if __name__ == "__main__":
    unittest.main()

