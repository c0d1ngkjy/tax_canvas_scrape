# tax_canvas_scrape
 web scraping node script

# quick start
cd tax_canvas_crawler
npm install
node consoleScript.js

# important
check reference/resItem.js file to see dcm object

# scripts
node consoleScript.js => scrapes data and writes json
node checkDuplicates.js => check duplicated DOC_ID from res data

node checkProxies.js => check useable proxies from txt file

# todo
fetching large data at once => spit into several batches
parse data => ex.dataExample directory
connect database? optional





