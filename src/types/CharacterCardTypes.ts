export type CharacterField = 'race' | 'class' | 'level' | 'hp' | 'ac' | 'alignment' | 'status';

export interface CharacterAction {
  type: string;  // Fully extensible - scenes define their own action types
  label?: string;
  enabled?: boolean;
  variant?: 'default' | 'danger';
}

export interface CharacterActionEvent {
  characterId: string;
  actionType: string;
}
