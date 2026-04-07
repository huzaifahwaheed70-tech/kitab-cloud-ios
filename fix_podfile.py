import re
import sys

pods_pbxproj = sys.argv[1]
with open(pods_pbxproj, "r") as f:
    content = f.read()

content = re.sub(r'CODE_SIGN_STYLE = Manual;', 'CODE_SIGN_STYLE = Automatic;', content)
content = re.sub(r'PROVISIONING_PROFILE_SPECIFIER = "[^"]*";', 'PROVISIONING_PROFILE_SPECIFIER = "";', content)
content = re.sub(r"PROVISIONING_PROFILE_SPECIFIER = '[^']*';", "PROVISIONING_PROFILE_SPECIFIER = '';", content)
content = re.sub(r'CODE_SIGN_IDENTITY = "[^"]*";', 'CODE_SIGN_IDENTITY = "";', content)

with open(pods_pbxproj, "w") as f:
    f.write(content)

print("Pods signing fixed successfully")
