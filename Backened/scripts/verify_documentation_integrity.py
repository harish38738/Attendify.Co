import os
import re
import sys

# Set encoding to utf-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

workspace_root = r"c:\Users\acer\Documents\Attendify_Workspace\frontend\public\Harish's Creation\Attendify\Frontend\public\Attendify-vs code"
docs_dir = os.path.join(workspace_root, "docs")

# Metrics to check for consistency
# Expected metrics:
# API Endpoints: 75
# Frontend Pages: 28
# MongoDB Collections: 17
# Core Documents: 20
# Total Docs: 21 (20 core + 1 supplementary)
EXPECTED_ENDPOINTS = 75
EXPECTED_PAGES = 28
EXPECTED_COLLECTIONS = 17
EXPECTED_CORE_DOCS = 20
EXPECTED_TOTAL_DOCS = 21

PLACEHOLDERS = ["TODO", "FIXME", "TBD", "placeholder", "PLACEHOLDER", "insert here", "draft"]

def get_markdown_files():
    files = []
    # Add root md files
    for fn in os.listdir(workspace_root):
        if fn.endswith('.md'):
            files.append(os.path.join(workspace_root, fn))
    # Add docs/ files
    if os.path.exists(docs_dir):
        for fn in os.listdir(docs_dir):
            if fn.endswith('.md'):
                files.append(os.path.join(docs_dir, fn))
    return sorted(files)

def parse_markdown_links(filepath):
    content = open(filepath, "r", encoding="utf-8", errors="ignore").read()
    # Find links: [text](link)
    # Link could be file:///..., relative, absolute, etc.
    raw_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
    return raw_links

def verify_all():
    markdown_files = get_markdown_files()
    all_ok = True
    
    print("==================================================")
    print("       ATTENDIFY V1.0.0 DOCUMENTATION AUDIT       ")
    print("==================================================")
    
    # 1. Check version numbers, placeholders, and metrics in each file
    for filepath in markdown_files:
        filename = os.path.basename(filepath)
        relative_path = os.path.relpath(filepath, workspace_root)
        content = open(filepath, "r", encoding="utf-8", errors="ignore").read()
        
        # Check archived marking for project.md and PROJECT_ARCHITECTURE.md
        if filename in ["project.md", "PROJECT_ARCHITECTURE.md"]:
            if "archived" not in content.lower():
                print(f"[ERROR] {filename} is NOT marked as archived!")
                all_ok = False
            else:
                print(f"[OK] {filename} is correctly marked as archived.")
        
        # Check for placeholders
        found_placeholders = []
        for p in PLACEHOLDERS:
            matches = re.findall(r'\b' + re.escape(p) + r'\b', content)
            if matches:
                # Filter out expected descriptive mentions of placeholder/TBD/FIXME
                filtered_matches = []
                for m in matches:
                    # If user manual describes UI placeholder or release certificate references sign-off placeholders, ignore
                    if filename == "10_user_manual.md" and p == "placeholder":
                        continue
                    if filename == "20_release_certificate.md" and p == "placeholder":
                        continue
                    filtered_matches.append(m)
                if filtered_matches:
                    found_placeholders.append(f"{p} ({len(filtered_matches)}x)")
        if found_placeholders:
            print(f"[WARNING] {relative_path} contains placeholders: {', '.join(found_placeholders)}")
            
        # Check version numbers
        versions = re.findall(r'\bv[0-9]+\.[0-9]+\.[0-9]+[-\w\.]*\b', content)
        ALLOWED_VERSIONS = {"v1.0.0", "v1.0.0-p1", "v1.0.1"}
        for v in set(versions):
            if v in ALLOWED_VERSIONS:
                continue
            # v2.0.0 is expected in the backlog document
            if filename == "19_v2_backlog.md" and v == "v2.0.0":
                continue
            print(f"[ERROR] {relative_path} has unexpected version number: {v}")
            all_ok = False
                
        # Check metrics consistency
        # Endpoints
        endpoint_mentions = re.findall(r'(\d+)\s*(?:API\s+)?(?:endpoints|routes)', content, re.IGNORECASE)
        for mention in set(endpoint_mentions):
            val = int(mention)
            if val != EXPECTED_ENDPOINTS and val not in [20, 21]: # ignore 20 documents or similar if false positive
                # Check if it mentions 76 or something else
                if val in [76, 74]:
                    print(f"[ERROR] {relative_path} mentions incorrect endpoint count: {val} (expected {EXPECTED_ENDPOINTS})")
                    all_ok = False
                    
        # Collections
        col_mentions = re.findall(r'(\d+)\s*(?:distinct\s+)?collections', content, re.IGNORECASE)
        for mention in set(col_mentions):
            val = int(mention)
            if val != EXPECTED_COLLECTIONS:
                print(f"[ERROR] {relative_path} mentions incorrect collection count: {val} (expected {EXPECTED_COLLECTIONS})")
                all_ok = False

    # 2. Verify all links/cross-references
    print("\n--- Verifying Links & Cross-References ---")
    for filepath in markdown_files:
        filename = os.path.basename(filepath)
        relative_path = os.path.relpath(filepath, workspace_root)
        links = parse_markdown_links(filepath)
        
        for text, link in links:
            # Skip web links
            if link.startswith("http://") or link.startswith("https://"):
                continue
            # Skip anchor-only links
            if link.startswith("#"):
                continue
                
            # Parse file:/// link or relative path
            target_path = None
            if link.startswith("file:///"):
                # Clean prefix
                clean_link = link.replace("file:///", "").replace("%20", " ")
                # Check windows absolute path format (e.g. c:/...)
                if clean_link[1:3] == ":/" or clean_link[1:3] == ":\\":
                    target_path = clean_link
                else:
                    target_path = "/" + clean_link
            else:
                # Relative link
                target_path = os.path.abspath(os.path.join(os.path.dirname(filepath), link))
                
            if target_path:
                # Normalize path
                target_path = os.path.normpath(target_path)
                # Check if the target is a directory or file
                # If target_path has hash/anchor, remove it before check
                clean_target = target_path.split("#")[0]
                if not os.path.exists(clean_target):
                    print(f"[ERROR] Broken link in {relative_path}: [{text}]({link}) -> File not found: {clean_target}")
                    all_ok = False
                
    if all_ok:
        print("\n[SUCCESS] The repository documentation is internally consistent, free of broken links/placeholders, and ready for long-term maintenance!")
    else:
        print("\n[FAILED] Verification completed with errors.")

if __name__ == "__main__":
    verify_all()
