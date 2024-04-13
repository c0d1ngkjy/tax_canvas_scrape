import data from './scrapedDocIds.json' assert { type: 'json' };

//data.forEach(d=>console.log(d))

const seen = new Set();
const duplicates = new Set();

data.forEach(item => {
  if (seen.has(item.dcm.DOC_ID)) {
    duplicates.add(item.dcm.DOC_ID); 
  } else {
    seen.add(item.dcm.DOC_ID);
  }
});
console.log("Duplicates:", Array.from(duplicates)); 
