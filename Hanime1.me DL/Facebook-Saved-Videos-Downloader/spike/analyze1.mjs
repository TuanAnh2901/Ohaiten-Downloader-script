import fs from 'node:fs';
// per-collection counts from containing_lists in 22_probeA_all.json
const a = JSON.parse(fs.readFileSync('spike/evidence/rerun/22_probeA_all.json', 'utf8'));
const items = a.items;
console.log('total items:', items.length, '| pages:', a.pages);
const perColl = {};
let uncat = 0, multiColl = 0;
const collNames = new Map();
for (const i of items) {
  for (const cl of i.containing_lists || []) {
    collNames.set(cl.id, cl.name);
    perColl[cl.id] = (perColl[cl.id] || 0) + 1;
    if (i.containing_lists.length > 1) multiColl++;
  }
  if (!i.containing_lists || i.containing_lists.length === 0) uncat++;
}
console.log('uncategorized:', uncat);
console.log('items in >1 collection:', multiColl);
for (const [id, cnt] of Object.entries(perColl)) console.log(`  ${collNames.get(id) || id}: ${cnt}`);
// check per-collection sums vs containing_lists counts
// count containing_lists where count field present
let countFieldTotal = 0, countFieldItems = 0;
for (const i of items) {
  if (typeof i.containing_count === 'number' && i.containing_count > 0) { countFieldTotal += i.containing_count; countFieldItems++; }
}
console.log('items with containing_count>0:', countFieldItems, '| sum of containing_count:', countFieldTotal);
// sample first 3 uncategorized
console.log('sample uncategorized:', JSON.stringify(items.filter(i => !i.containing_lists || !i.containing_lists.length).slice(0, 5), null, 2));
// are uncategorized items older (later in the list = older saves)?
console.log('first 3 items:', JSON.stringify(items.slice(0, 3).map(i => ({ id: i.save_id, lists: i.containing_lists, count: i.containing_count })), null, 2));
console.log('last 3 items:', JSON.stringify(items.slice(-3).map(i => ({ id: i.save_id, lists: i.containing_lists, count: i.containing_count })), null, 2));
