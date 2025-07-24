import React from 'react';
import { UserPreferences } from './UserPreferences';

export default {
  title: 'Components/UserPreferences',
  component: UserPreferences,
};

export const Default = () => (
  <UserPreferences
    onPreferencesChange={(prefs) => {
      console.log('Préférences mises à jour:', prefs);
    }}
  />
);