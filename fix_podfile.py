import re

with open('Pods/Pods.xcodeproj/project.pbxproj', 'r') as f:
    content = f.read()

content = re.sub(r'CODE_SIGN_STYLE = Manual;', 'CODE_SIGN_STYLE = Automatic;', content)
content = re.sub(r'CODE_SIGNING_ALLOWED = YES;', 'CODE_SIGNING_ALLOWED = NO;', content)
content = re.sub(r'CODE_SIGNING_REQUIRED = YES;', 'CODE_SIGNING_REQUIRED = NO;', content)
content = re.sub(r'CODE_SIGN_IDENTITY = ".*?";', 'CODE_SIGN_IDENTITY = "";', content)
content = re.sub(r'PROVISIONING_PROFILE_SPECIFIER = ".*?";', 'PROVISIONING_PROFILE_SPECIFIER = "";', content)
content = re.sub(r'PROVISIONING_PROFILE = ".*?";', 'PROVISIONING_PROFILE = "";', content)
content = re.sub(r'ProvisioningStyle = Manual;', 'ProvisioningStyle = Automatic;', content)
content = re.sub(r'DEVELOPMENT_TEAM = \w+;', 'DEVELOPMENT_TEAM = "";', content)

with open('Pods/Pods.xcodeproj/project.pbxproj', 'w') as f:
    f.write(content)

print('Pods signing fixed successfully')
