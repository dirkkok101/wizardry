export interface ActiveSpell {
  name: string;        // "MILWA", "DUMAPIC", "LATUMAPIC"
  icon: string;        // "💡", "🧭", "👁️"
  description: string; // "Light (Radius: 1)", "Monsters Identified"
  variant?: 'light' | 'identification';  // For color styling
}
