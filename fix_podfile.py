import sys
import re

podfile_path = sys.argv[1]

with open(podfile_path, 'r') as f:
    content = f.read()

hook = """
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      config.build_settings['CODE_SIGN_IDENTITY'] = ''
    end
  end
end"""

# Remove any existing post_install block
content = re.sub(r'post_install do.*?^end', '', content, flags=re.DOTALL | re.MULTILINE)

# Add our hook
content = content + hook

with open(podfile_path, 'w') as f:
    f.write(content)

print('Podfile updated successfully')
print('New Podfile contents:')
print(content)
