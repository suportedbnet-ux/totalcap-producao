import sys

file_path = r'c:\Sistema\Totalcap\frontend\src\pages\Servicos.tsx'
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const statusText = `STATUS:' in line:
        lines[i] = '      const jsonHeaders = response.data?.request_info?.headers ? JSON.stringify(response.data.request_info.headers, null, 2) : \"{}\";\n' + line.replace('=== REQUISI', '=== HEADER ENVIADO ===\\n${jsonHeaders}\\n\\n=== REQUISI')
    elif 'const debugText = `STATUS:' in line:
        lines[i] = '      const jsonHeaders = err.response?.data?.request_info?.headers ? JSON.stringify(err.response.data.request_info.headers, null, 2) : \"{}\";\n' + line.replace('=== REQUISI', '=== HEADER ENVIADO ===\\n${jsonHeaders}\\n\\n=== REQUISI')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Success')
