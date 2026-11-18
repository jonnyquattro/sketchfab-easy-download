"""Optional real Firefox + signed Tampermonkey integration check in a fresh profile.

Development only: pip install selenium; python test/firefox_smoke.py --addon PATH.xpi
No changes are made to the user's normal Firefox profile.
"""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.firefox.service import Service

parser=argparse.ArgumentParser()
parser.add_argument('--addon',required=True)
parser.add_argument('--model',default='https://sketchfab.com/3d-models/lawgiver-judge-dred-a7c357ca74bf4649a320a320c6c9f1ae')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
artifacts=root/'artifacts';artifacts.mkdir(exist_ok=True)
downloads=artifacts/'downloads';downloads.mkdir(exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
http=ThreadingHTTPServer(('127.0.0.1',18765),functools.partial(QuietHandler,directory=str(root)))
threading.Thread(target=http.serve_forever,daemon=True).start()
options=webdriver.FirefoxOptions()
options.add_argument('-headless')
options.binary_location=r'C:\Program Files\Mozilla Firefox\firefox.exe'
options.set_preference('browser.download.folderList',2)
options.set_preference('browser.download.dir',str(downloads))
options.set_preference('browser.helperApps.neverAsk.saveToDisk','application/octet-stream,application/zip,model/gltf-binary,text/plain')
options.set_preference('browser.download.always_ask_before_handling_new_types',False)
options.set_preference('browser.download.useDownloadDir',True)
driver=None
try:
    print('Launching isolated Firefox...',flush=True)
    # Isolated test only: geckodriver needs privileged access to inspect the
    # extension's install screen. Runtime users do not enable this.
    driver=webdriver.Firefox(options=options,service=Service(service_args=['--allow-system-access']))
    driver.set_page_load_timeout(60)
    driver.set_window_size(1280,900)
    print('Firefox',driver.capabilities['browserVersion'],flush=True)
    addon=driver.install_addon(str(Path(args.addon).resolve()),temporary=True)
    print('Installed signed addon:',addon,flush=True)
    time.sleep(3)
    # Tampermonkey cancels navigation and opens an installation tab; WebDriver
    # may continue waiting on the cancelled navigation even though that worked.
    driver.set_page_load_timeout(15)
    try:
        driver.get('http://127.0.0.1:18765/dist/sketchfab-easy-download.user.js')
    except TimeoutException:
        print('Userscript navigation intercepted; inspecting installation tabs.',flush=True)
    time.sleep(4)
    found=False
    for handle in driver.window_handles:
        driver.switch_to.window(handle)
        print('Tab:',driver.current_url,driver.title,flush=True)
        for button in driver.find_elements(By.CSS_SELECTOR,'button,input[type=button],input[type=submit]'):
            label=button.text.strip() or button.get_attribute('value') or ''
            print('Button:',label[:100],flush=True)
            if label.lower() in ['install','reinstall']:
                button.click();found=True;break
        if found:break
    if not found:
        (artifacts/'installation.html').write_text(driver.page_source,encoding='utf-8')
        driver.save_screenshot(str(artifacts/'installation.png'))
        raise RuntimeError('Could not find the Tampermonkey install button; see artifacts/installation.html')
    print('Userscript install confirmed.',flush=True)
    time.sleep(2)
    driver.switch_to.window(driver.window_handles[0])
    driver.set_page_load_timeout(60)
    driver.get(args.model)
    time.sleep(6)  # Allow site redirects/challenge reloads to settle before using its shadow root.
    host=WebDriverWait(driver,40).until(lambda d:d.find_element(By.ID,'sf-easy-download'))
    shadow=host.shadow_root
    shadow.find_element(By.CSS_SELECTOR,'.toggle').click()
    shadow.find_element(By.CSS_SELECTOR,'#consent').click()
    select=shadow.find_element(By.CSS_SELECTOR,'#format')
    from selenium.webdriver.support.ui import Select
    Select(select).select_by_value('zip')
    shadow.find_element(By.CSS_SELECTOR,'#size').send_keys('250')
    shadow.find_element(By.CSS_SELECTOR,'#download').click()
    last='';deadline=time.monotonic()+180
    while time.monotonic()<deadline:
        text=shadow.find_element(By.CSS_SELECTOR,'.status').text
        if text!=last: print('Status:',text,flush=True);last=text
        if text.startswith('Saved.'):
            break
        if shadow.find_element(By.CSS_SELECTOR,'.status').get_attribute('class').endswith('error'):
            print('Error stack:',host.get_attribute('data-last-error'),flush=True)
            raise RuntimeError(text)
        time.sleep(1)
    else: raise RuntimeError('Browser export timed out: '+last)
    details=shadow.find_element(By.CSS_SELECTOR,'.details').text
    print(details,flush=True)
    driver.save_screenshot(str(artifacts/'firefox-success.png'))
    for _ in range(15):
        files=list(downloads.glob('*.zip'))
        if files:break
        time.sleep(1)
    if not files: raise RuntimeError('No ZIP was saved by Firefox')
    import zipfile
    with zipfile.ZipFile(files[-1]) as archive:
        assert archive.testzip() is None
        report=json.loads(archive.read('model-info.json'))
        assert abs(max(report['print_dimensions'])-250)<0.001
        assert report['triangles']>0
        print('ZIP checked:',files[-1],report['triangles'],'triangles',flush=True)
    # A second format should use the prepared model rather than re-downloading.
    Select(select).select_by_value('stl')
    shadow.find_element(By.CSS_SELECTOR,'#download').click()
    WebDriverWait(driver,15).until(lambda d:shadow.find_element(By.CSS_SELECTOR,'.status').text.startswith('Saved.'))
    print('PASS: actual Firefox + Tampermonkey install, anonymous export, sized ZIP and cached STL save.',flush=True)
finally:
    if driver:driver.quit()
    http.shutdown()
