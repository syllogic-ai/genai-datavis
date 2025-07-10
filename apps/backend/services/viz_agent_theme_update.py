# Theme-aware color handling for viz_agent.py
# This file contains the updated functions to use theme color references instead of hex colors

def convert_chart_data_to_chart_config_with_theme(data_cols: list[str]) -> dict:
    """
    Convert data columns to chart configuration using theme color references.
    Instead of hex colors, uses CSS variable references like var(--chart-1).
    """
    chart_config = {}
    for i, col in enumerate(data_cols):
        # Use theme color reference instead of hex color
        chart_index = (i % 5) + 1  # Cycle through chart-1 to chart-5
        chart_config[col] = {
            "color": f"var(--chart-{chart_index})",
            "label": col.replace("_", " ").title()
        }
    return chart_config


class ThemeAwareColorPalette:
    """
    Color palette that uses theme references instead of hex colors.
    """
    def __init__(self, num_colors: int = 5):
        # Generate theme color references
        self.colors = [f"var(--chart-{i+1})" for i in range(num_colors)]
    
    @classmethod
    def default(cls):
        """Create default palette with 5 theme colors."""
        return cls(num_colors=5)
    
    def get_color(self, index: int) -> str:
        """Get theme color reference by index with wraparound."""
        return self.colors[index % len(self.colors)]
    
    def extend_to(self, count: int) -> list[str]:
        """Get a list of theme color references, cycling if needed."""
        result = []
        for i in range(count):
            result.append(self.get_color(i))
        return result


# Example usage in visualization functions:
"""
# In visualize_bar function, replace:
chart_colors = await get_color_palette(ctx)
colors = colorPaletteClass.from_chart_colors(chart_colors).colors
chart_config = convert_chart_data_to_chart_config(data_cols, colors)

# With:
chart_config = convert_chart_data_to_chart_config_with_theme(data_cols)

# Or if you need more control:
color_palette = ThemeAwareColorPalette.default()
chart_config = {}
for i, col in enumerate(data_cols):
    chart_config[col] = {
        "color": color_palette.get_color(i),
        "label": col.replace("_", " ").title()
    }
"""

# For KPI colors, use specific theme colors:
def get_kpi_theme_color(trend: str = None) -> str:
    """
    Get theme color for KPI based on trend.
    Uses semantic color mappings from the theme.
    """
    if trend == "up":
        return "var(--chart-2)"  # Usually green
    elif trend == "down":
        return "var(--chart-4)"  # Usually red
    else:
        return "var(--chart-1)"  # Default primary chart color


# For table configs that need accent colors:
def get_table_accent_colors() -> dict:
    """Get theme colors for table accents."""
    return {
        "header": "var(--primary)",
        "border": "var(--border)",
        "hover": "var(--accent)",
        "selected": "var(--chart-1)"
    }