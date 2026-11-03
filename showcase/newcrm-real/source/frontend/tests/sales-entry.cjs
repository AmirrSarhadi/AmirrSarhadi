const assert=require('node:assert/strict');
(async()=>{
  const {parseToman,formatToman,parsePersianDate,persianDate}=await import('../lib/sales-entry.ts');
  assert.equal(parseToman('۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳'),'9007199254740993');
  assert.equal(parseToman('۰'), '0'); assert.equal(parseToman(''),null);
  assert.equal(parseToman('٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩'),'999999999999999999');
  for(const value of ['1.5','۱٫۵','1e3','-1','1,2','1000000000000000000'])assert.throws(()=>parseToman(value));
  assert.ok(formatToman('9007199254740993').includes('۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳'));
  assert.equal(parsePersianDate('۱۴۰۵/۰۸/۰۴'),'2026-10-26');
  assert.equal(persianDate('2026-10-26'),'1405/08/04');
  assert.equal(parsePersianDate('۱۴۰۳/۱۲/۳۰'),'2025-03-20');
  assert.throws(()=>parsePersianDate('۱۴۰۴/۱۲/۳۰'));
  assert.throws(()=>parsePersianDate('۱۴۰۵/۰۷/۳۱'));
  assert.equal(parsePersianDate(''),null);
  console.log('PASS: exact toman including values beyond Number precision, invalid fractional/grouped/negative amounts, Persian calendar round-trip and leap boundaries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
