import os

IGNORED_DIRS = {'.pytest_cache', 'node_modules', '.cursor', '.git'}

def print_tree(start_path='.', indent='', depth=0, max_depth=2):
    if depth > max_depth:
        return
    for item in sorted(os.listdir(start_path)):
        if item in IGNORED_DIRS:
            continue
        path = os.path.join(start_path, item)
        if os.path.isdir(path):
            print(f"{indent}📁 {item}/")
            print_tree(path, indent + '    ', depth + 1, max_depth)
        else:
            print(f"{indent}📄 {item}")

print_tree('.', max_depth=2)
