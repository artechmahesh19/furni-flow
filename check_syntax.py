import sys

def check_brackets(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    brackets = {'}': '{', ')': '(', ']': '['}
    stack = []
    lines = text.split('\n')
    
    in_string = False
    string_char = ''
    
    for line_num, line in enumerate(lines, 1):
        i = 0
        while i < len(line):
            c = line[i]
            
            # Handle comments
            if not in_string and c == '/' and i+1 < len(line) and line[i+1] == '/':
                break # Rest of line is comment
            
            # Handle strings
            if not in_string and c in ('\'', '\"', '\`'):
                in_string = True
                string_char = c
            elif in_string and c == string_char:
                # Check for escape
                escapes = 0
                j = i - 1
                while j >= 0 and line[j] == '\\':
                    escapes += 1
                    j -= 1
                if escapes % 2 == 0:
                    in_string = False
            
            # Handle brackets
            elif not in_string and c in brackets.values():
                stack.append((c, line_num))
            elif not in_string and c in brackets.keys():
                if not stack:
                    print(f'Error: Unmatched closing {c} at line {line_num}')
                    return False
                top, top_line = stack.pop()
                if top != brackets[c]:
                    print(f'Error: Mismatched closing {c} at line {line_num}. Expected {brackets[c]} (opened at line {top_line})')
                    return False
            i += 1

    if stack:
        print(f'Error: Unclosed brackets remaining: {stack}')
        return False
    else:
        print('Syntax looks OK! (brackets match)')
        return True

check_brackets('C:/Users/HR/.gemini/antigravity/scratch/app.js')
