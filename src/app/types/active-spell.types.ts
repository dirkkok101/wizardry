export interface ActiveSpell {
  name: string;        // "MILWA", "DUMAPIC", "LATUMAPIC", "MAPORFIC"
  icon: string;        // "💡", "🧭", "👁️", "🛡️"
  description: string; // "Light (Radius: 1)", "Monsters Identified", "Party AC -2"
  variant?: 'light' | 'identification' | 'protection';  // For color styling
}
