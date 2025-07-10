# Dashboard Theme System Integration Testing Guide

## Overview
This guide provides step-by-step instructions for testing the new dashboard-level theme system implementation.

## Prerequisites
1. Database migration has been run (themes table created, color_palettes table dropped)
2. Frontend and backend servers are running
3. You have at least one dashboard created with some widgets

## Test Scenarios

### 1. Theme Provider Integration
**Goal**: Verify the DashboardThemeProvider is working correctly

**Steps**:
1. Navigate to any dashboard
2. Open browser developer tools (F12)
3. Check the Console for any theme-related errors
4. Check that CSS variables are being set on the document root:
   - Look for `--chart-1` through `--chart-5` variables
   - Look for font variables: `--font-sans`, `--font-serif`, `--font-mono`
   - Look for UI color variables: `--foreground`, `--background`, etc.

**Expected Result**:
- No console errors
- CSS variables are present and have OKLCH color values
- Default theme is applied automatically

### 2. Theme Selector UI
**Goal**: Verify the theme selector is accessible and functional

**Steps**:
1. Navigate to a dashboard
2. Look for the "Theme" button in the header (next to Sources and Publish)
3. Click the Theme button

**Expected Result**:
- A popover opens showing:
  - Current active theme
  - Theme selector dropdown
  - "New Theme" button
  - Theme preview with 5 color swatches

### 3. Creating a New Theme
**Goal**: Test theme creation functionality

**Steps**:
1. Click the "Theme" button in dashboard header
2. Click "New Theme" button
3. Fill in:
   - Theme Name: "My Custom Theme"
   - Description: "A test theme"
   - Base Preset: Select different presets (Ocean, Sunset, Forest, etc.)
4. Click "Create Theme"

**Expected Result**:
- Dialog closes
- New theme appears in the dropdown
- Can select and activate the new theme

### 4. Theme Switching
**Goal**: Verify themes can be switched and colors update

**Steps**:
1. Create a dashboard with various widgets:
   - Bar chart
   - Line chart
   - Pie chart
   - KPI card
2. Open theme selector
3. Switch between different themes

**Expected Result**:
- Chart colors update immediately
- KPI colors change based on theme
- No page reload required
- Colors persist after page refresh

### 5. Widget Color Resolution
**Goal**: Verify widgets correctly use theme colors

**Steps**:
1. Create a new widget using the chat interface
2. Check the widget configuration in the browser DevTools Network tab
3. Look for the chartConfig in the widget data

**Expected Result**:
- Colors in chartConfig use format: `"var(--chart-1)"`, `"var(--chart-2)"`, etc.
- NOT hex colors like `"#3b82f6"`
- Colors render correctly in the charts

### 6. Backend Integration
**Goal**: Verify viz_agent.py uses theme references

**Steps**:
1. Create a new chart widget via chat
2. Monitor the network requests
3. Check the response from `/api/chat/analyze`

**Expected Result**:
- Widget config contains color references: `"var(--chart-1)"`
- No hex color codes in the response
- Charts render with correct theme colors

### 7. Dark Mode Compatibility
**Goal**: Test theme behavior in dark mode

**Steps**:
1. Switch to dark mode (using system or app settings)
2. Check that theme colors adjust appropriately
3. Switch themes while in dark mode

**Expected Result**:
- Dark mode styles from theme are applied
- UI remains readable and well-contrasted
- Theme switching works in both light and dark modes

### 8. Font Configuration
**Goal**: Test font settings in themes

**Steps**:
1. Create a theme with different font settings
2. Check that fonts are applied to:
   - Dashboard UI elements
   - Widget titles and labels
   - Chart text

**Expected Result**:
- Font CSS variables are updated
- Text renders with selected fonts
- Font sizes adjust based on theme settings

### 9. Multiple Dashboards
**Goal**: Verify each dashboard maintains its own theme

**Steps**:
1. Create 2-3 different dashboards
2. Apply different themes to each
3. Switch between dashboards

**Expected Result**:
- Each dashboard retains its selected theme
- Theme changes when switching dashboards
- No theme bleeding between dashboards

### 10. Theme Persistence
**Goal**: Verify themes persist correctly

**Steps**:
1. Set a theme for a dashboard
2. Refresh the page
3. Log out and log back in
4. Return to the dashboard

**Expected Result**:
- Theme selection persists across:
  - Page refreshes
  - User sessions
  - Browser restarts

## Troubleshooting

### Common Issues:

1. **"No themes found" error**
   - Check that migration ran successfully
   - Verify default theme was created for dashboard

2. **Colors not updating**
   - Check browser console for errors
   - Verify DashboardThemeProvider is wrapping the page
   - Check CSS variables in DevTools

3. **Backend still sending hex colors**
   - Ensure viz_agent.py changes were applied
   - Restart backend server
   - Check colorPaletteClass implementation

4. **Theme selector not visible**
   - Verify dashboardId is passed to DashboardHeader
   - Check that user has permissions for dashboard

## Performance Testing

1. **Theme Switching Speed**
   - Should be instant (<100ms)
   - No visible flashing or layout shifts

2. **Initial Load**
   - Theme should apply before widgets render
   - No flash of unstyled content

3. **Memory Usage**
   - Check DevTools Memory tab
   - Theme switching shouldn't cause memory leaks

## API Testing

Test the theme API endpoints:

```bash
# Get themes for a dashboard
GET /api/dashboard/{dashboardId}/themes

# Create a new theme
POST /api/dashboard/{dashboardId}/themes

# Update a theme
PUT /api/dashboard/{dashboardId}/themes/{themeId}

# Activate a theme
POST /api/dashboard/{dashboardId}/themes/{themeId}/activate

# Delete a theme
DELETE /api/dashboard/{dashboardId}/themes/{themeId}
```

## Success Criteria

✅ All widgets use theme colors dynamically
✅ Theme switching is instant and smooth
✅ Each dashboard can have different themes
✅ Themes persist across sessions
✅ Backend generates theme references, not hex colors
✅ Font configuration works correctly
✅ Dark mode compatibility
✅ No console errors or warnings
✅ Good performance (no lag or memory issues)