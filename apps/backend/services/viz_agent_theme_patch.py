# Patch for viz_agent.py to use theme color references instead of hex colors
# Apply these changes to the existing viz_agent.py file

# 1. Replace the colorPaletteClass (around lines 166-186) with:

class colorPaletteClass:
    """Color palette that uses theme references instead of hex colors."""
    
    def __init__(self, colors: List[str] = None):
        if colors is None:
            # Default to theme color references
            self.colors = [
                "var(--chart-1)",
                "var(--chart-2)", 
                "var(--chart-3)",
                "var(--chart-4)",
                "var(--chart-5)"
            ]
        else:
            self.colors = colors
    
    @classmethod
    def from_chart_colors(cls, chart_colors: Optional[Dict[str, str]]) -> 'colorPaletteClass':
        """
        Create a color palette from chart colors dict.
        Instead of converting to hex, we'll use theme references.
        """
        if not chart_colors:
            return cls()  # Return default theme references
        
        # Generate theme color references based on available colors
        colors = []
        for i in range(1, 11):  # Support up to 10 colors
            key = f"chart{i}"
            if key in chart_colors:
                # Use theme variable reference instead of converting to hex
                colors.append(f"var(--chart-{i})")
            else:
                break
        
        # If no colors found, use defaults
        if not colors:
            return cls()
            
        return cls(colors)


# 2. Remove or comment out the hsl_to_hex function (lines 188-222)
# This function is no longer needed since we're not converting to hex


# 3. Update the convert_chart_data_to_chart_config function in chat.py to use theme references:
# In apps/backend/utils/chat.py, update the function around lines 218-225:

def convert_chart_data_to_chart_config(data_cols: list[str], colors: list[str]) -> dict:
    """
    Convert data columns to chart configuration using theme color references.
    Colors should already be in the format "var(--chart-N)".
    """
    chart_config = {}
    for i, col in enumerate(data_cols):
        chart_config[col] = {
            "color": colors[i % len(colors)],  # Use theme reference directly
            "label": col.replace("_", " ").title()
        }
    return chart_config


# 4. Update the get_color_palette function (around lines 53-81) to not fetch from database:

async def get_color_palette(ctx: RunContext[Deps]) -> Dict[str, str]:
    """
    Get color palette - now returns theme references instead of fetching from DB.
    Dashboard themes are handled on the frontend.
    """
    # Return a standard set of theme color references
    # The actual colors will be resolved on the frontend based on the dashboard theme
    return {
        "chart1": "var(--chart-1)",
        "chart2": "var(--chart-2)",
        "chart3": "var(--chart-3)",
        "chart4": "var(--chart-4)",
        "chart5": "var(--chart-5)"
    }


# 5. For KPI visualization, update the visualize_kpi function to use theme colors:
# Around lines 527-605, in the styles dictionary:

styles = {
    "valueColor": "var(--foreground)",
    "labelColor": "var(--muted-foreground)",
    "subLabelColor": "var(--muted-foreground)",
    "changePositiveColor": "var(--chart-2)",  # Usually green
    "changeNegativeColor": "var(--chart-4)",  # Usually red
    "changeFlatColor": "var(--muted-foreground)",
    "backgroundColor": "transparent",
    # ... rest of the styles
}


# Note: The visualization functions (visualize_bar, visualize_line, etc.) don't need changes
# because they already use the colorPaletteClass and convert_chart_data_to_chart_config
# which we've updated above to use theme references.