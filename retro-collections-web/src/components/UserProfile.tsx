import { useEffect, useState } from 'react';
import {
  useGetUserByIdQuery,
  useCreateOrUpdateUserMutation,
} from '../api/firestore/firestoreApi';
import type { User } from 'firebase/auth';

interface UserProfileProps {
  user: User;
}

function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: userProfile } = useGetUserByIdQuery(user.uid, {
    skip: !user.uid,
  });

  const [updateUser] = useCreateOrUpdateUserMutation();

  useEffect(() => {
    if (userProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(userProfile.name || '');
      setNickname(userProfile.nickname || '');
      setIsPublic(userProfile.visibility?.public || false);
    }
  }, [userProfile]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Validate: if public, nickname is required
      if (isPublic && !nickname.trim()) {
        setError('Nickname is required to make your profile public');
        setIsLoading(false);
        return;
      }

      // Validate: nickname must be non-empty if provided
      if (nickname && !nickname.trim()) {
        setError('Nickname cannot be empty');
        setIsLoading(false);
        return;
      }

      await updateUser({
        id: user.uid,
        name: name.trim() || undefined,
        nickname: nickname.trim() || undefined,
        visibility: {
          public: isPublic,
        },
      }).unwrap();

      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setName(userProfile.name || '');
      setNickname(userProfile.nickname || '');
      setIsPublic(userProfile.visibility?.public || false);
    }
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">My Profile</h2>
          {!isEditing && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error shadow-sm text-sm">{error}</div>
        )}
        {success && (
          <div className="alert alert-success shadow-sm text-sm">{success}</div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="label text-sm">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={isLoading}
              />
            </div>

            {/* Nickname Input */}
            <div>
              <label className="label text-sm">
                <span className="label-text">
                  Nickname {isPublic && <span className="text-error">*</span>}
                </span>
                <span className="label-text-alt text-xs text-base-content/60">
                  Used to find you when profile is public
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your unique nickname"
                disabled={isLoading}
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">
                Make my profile public
                {isPublic && (
                  <span className="ml-1 text-xs text-base-content/60">
                    (nickname required)
                  </span>
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                className="btn btn-primary btn-sm flex-1"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-ghost btn-sm flex-1"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display Name */}
            <div>
              <p className="text-xs text-base-content/60">Name</p>
              <p className="text-sm font-medium">
                {name || <span className="text-base-content/50">Not set</span>}
              </p>
            </div>

            {/* Display Nickname */}
            <div>
              <p className="text-xs text-base-content/60">Nickname</p>
              <p className="text-sm font-medium">
                {nickname ? (
                  <span>@{nickname}</span>
                ) : (
                  <span className="text-base-content/50">Not set</span>
                )}
              </p>
            </div>

            {/* Display Visibility */}
            <div>
              <p className="text-xs text-base-content/60">Profile Visibility</p>
              <p className="text-sm font-medium">
                <span className={isPublic ? 'text-success' : 'text-warning'}>
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
