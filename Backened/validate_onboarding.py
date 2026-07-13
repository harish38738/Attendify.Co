content = open('server.py', encoding='utf-8').read()

tag = 'settings/onboarding'
idx = content.find(tag)
while idx != -1:
    line_num = content[:idx].count('\n') + 1
    line = content.split('\n')[line_num-1].strip()
    print(f'L{line_num}: {line}')
    idx = content.find(tag, idx + 1)

print('---')
# Find get_onboarding_settings body
start = content.find('async def get_onboarding_settings')
snippet = content[start:start+300]
print(snippet)
print('---')
# Find complete_student_onboarding body
start = content.find('async def complete_student_onboarding')
snippet = content[start:start+300]
print(snippet)
