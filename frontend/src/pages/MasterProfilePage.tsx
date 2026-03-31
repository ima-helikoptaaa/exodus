import { useCallback } from 'react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import ProfileSectionEditor from '@/components/profile/ProfileSectionEditor';
import { PROFILE_SECTIONS } from '@/types';
import type { ProfileSection } from '@/types';

export default function MasterProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const handleSave = useCallback(
    (section: ProfileSection, value: string) => {
      if (!profile) return;
      updateProfile.mutate({
        ...profile.sections,
        [section]: value,
      });
    },
    [profile, updateProfile],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const sections = (profile?.sections ?? {}) as Record<ProfileSection, string>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Master Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Store all your professional details here. This data is used to generate tailored resumes.
        </p>
      </div>

      {PROFILE_SECTIONS.map((section) => (
        <ProfileSectionEditor
          key={section}
          section={section}
          value={sections[section] || ''}
          onSave={handleSave}
          saving={updateProfile.isPending}
        />
      ))}
    </div>
  );
}
