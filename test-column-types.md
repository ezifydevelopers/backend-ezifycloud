# Testing EMAIL and PHONE Column Types

## Steps to Test:

### 1. Restart Backend Server
1. Stop the current backend server (Ctrl+C in the terminal running `npm run dev`)
2. Run: `npx prisma generate` (to regenerate client with new enum values)
3. Restart: `npm run dev`

### 2. Test Creating EMAIL Column
1. Navigate to a board (e.g., `/workspaces/{id}/boards/{boardId}`)
2. Click "Add Column" or open column management
3. Select column type: **Email**
4. Enter column name: "Contact Email"
5. Save the column
6. ✅ Verify: Column appears in the board with type "Email"

### 3. Test Creating PHONE Column
1. In the same board, add another column
2. Select column type: **Phone**
3. Enter column name: "Phone Number"
4. Save the column
5. ✅ Verify: Column appears in the board with type "Phone"

### 4. Test Entering Email Value
1. Click on a cell in the "Contact Email" column
2. Enter: `test@example.com`
3. Save the cell
4. ✅ Verify: 
   - Value is displayed as a clickable blue link
   - Clicking opens email client (mailto: link)
   - Browser validation works (invalid emails show error)

### 5. Test Entering Phone Value
1. Click on a cell in the "Phone Number" column
2. Enter: `+1 (555) 123-4567`
3. Save the cell
4. ✅ Verify:
   - Value is displayed as a clickable blue link
   - Clicking opens phone dialer (tel: link)
   - Formatting is preserved

### 6. Test in Create Item Dialog
1. Click "New Item" button
2. Fill in required fields
3. ✅ Verify:
   - Email column shows email input type with placeholder `email@example.com`
   - Phone column shows tel input type with placeholder `+1 (555) 123-4567`
   - Form validation works

### 7. Test in Form View
1. Switch board view to "Form" view
2. ✅ Verify:
   - Email field has proper input type and placeholder
   - Phone field has proper input type and placeholder
   - Values can be entered and saved

## Expected Behavior:

### Email Column:
- Input type: `email`
- Placeholder: `email@example.com`
- Display: Clickable mailto link (blue, underlined on hover)
- Validation: Browser native email validation

### Phone Column:
- Input type: `tel`
- Placeholder: `+1 (555) 123-4567`
- Display: Clickable tel link (blue, underlined on hover)
- Validation: Accepts various phone formats

## Issues to Check:

- [ ] Prisma client regenerated successfully
- [ ] Backend starts without errors
- [ ] Column types appear in CreateColumnDialog dropdown
- [ ] Columns can be created and saved
- [ ] Values display correctly in table view
- [ ] Values are editable inline
- [ ] Links work (mailto and tel)
- [ ] Form views work correctly

