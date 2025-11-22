import { loadWorkItems } from './utils/data-loader.js';
import { loadWorkItemHistory } from './utils/history-loader.js';

const workItems = loadWorkItems('/Users/axos-agallentes/git/analyze-backlog/data/july_november_2025/all_work_items_july_november_2025.json');
const history = loadWorkItemHistory('/Users/axos-agallentes/git/analyze-backlog/data/july_november_2025/history_detailed/all_work_item_updates.json');

console.log(`Total work items: ${workItems.length}`);
console.log(`Total history records: ${history.length}`);

// Find a work item with state transitions
const itemWithHistory = workItems.find(wi => {
  const updates = history.filter(h => h.workItemId === wi.id);
  return updates.some(u => u.fields?.['System.State']?.oldValue && u.fields?.['System.State']?.newValue);
});

if (itemWithHistory) {
  console.log(`\nSample work item: #${itemWithHistory.id}`);
  console.log(`Current state: ${itemWithHistory.fields['System.State']}`);
  console.log(`Created: ${itemWithHistory.fields['System.CreatedDate']}`);

  const updates = history.filter(h => h.workItemId === itemWithHistory.id);
  console.log(`\nState transitions for this item:`);

  for (const update of updates.filter(u => u.fields?.['System.State'])) {
    const state = update.fields!['System.State'];
    console.log(`  Rev ${update.rev} (${update.revisedDate}):`);
    if (state.oldValue) console.log(`    ${state.oldValue} → ${state.newValue}`);
    else console.log(`    Initial: ${state.newValue}`);
  }
}
