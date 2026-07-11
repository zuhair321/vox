import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import ToggleRow from '../../components/settings/ToggleRow';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { soundManager } from '../../utils/soundManager';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const { addToast } = useUiStore();
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  // Sync with the manager's state.
  useEffect(() => {
    const interval = setInterval(() => {
      setSoundEnabled(soundManager.isEnabled());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="settings-page">
      <BackHeader title="NOTIFICATIONS" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <section>
          <SectionHeader title="GENERAL" />
          <ToggleRow
            label="Enable Desktop Notifications"
            description="Show system notifications for new messages and calls."
            value={settings.desktopNotifications}
            onChange={() => {
              settings.toggle('desktopNotifications');
              if ('Notification' in window && !settings.desktopNotifications) {
                Notification.requestPermission().then((p) => {
                  if (p === 'granted') addToast('Desktop notifications enabled.', 'success');
                  else addToast('Permission denied.', 'warning');
                });
              }
            }}
          />
          <ToggleRow
            label="Enable Notification Sounds"
            description="Play sounds for new messages and alerts."
            value={settings.notificationSounds}
            onChange={() => settings.toggle('notificationSounds')}
          />
          <ToggleRow
            label="Enable Unread Badge"
            description="Show unread count on the taskbar icon."
            value={settings.unreadBadge}
            onChange={() => settings.toggle('unreadBadge')}
          />
          <ToggleRow
            label="Enable Flash Frame"
            description="Flash the window when a notification arrives."
            value={settings.flashFrame}
            onChange={() => settings.toggle('flashFrame')}
          />
        </section>

        <section>
          <SectionHeader title="MESSAGES" />
          <ToggleRow
            label="All Messages"
            description="Notify for every message in channels you're active in."
            value={settings.notifyAllMessages}
            onChange={() => settings.toggle('notifyAllMessages')}
          />
          <ToggleRow
            label="@Mentions Only"
            description="Only notify when someone mentions you or your roles."
            value={settings.notifyMentions}
            onChange={() => settings.toggle('notifyMentions')}
          />
          <ToggleRow
            label="Direct Messages"
            description="Notify for every direct message received."
            value={settings.notifyDMs}
            onChange={() => settings.toggle('notifyDMs')}
          />
          <ToggleRow
            label="Incoming Calls"
            description="Notify when receiving a voice or video call."
            value={settings.notifyCalls}
            onChange={() => settings.toggle('notifyCalls')}
          />
          <ToggleRow
            label="Friend Requests"
            description="Notify when someone sends you a friend request."
            value={settings.notifyFriendRequests}
            onChange={() => settings.toggle('notifyFriendRequests')}
          />
        </section>

        <section>
          <SectionHeader title="SOUNDS" />
          <ToggleRow
            label="Enable Ambient Sound Effects"
            description="Tasteful UI sounds — message blips, join chimes, ping tones. Matches the VOX void aesthetic."
            value={soundEnabled}
            onChange={() => {
              const next = !soundEnabled;
              soundManager.setEnabled(next);
              setSoundEnabled(next);
              if (next) addToast('Ambient sounds enabled.', 'success');
            }}
          />
          <ToggleRow
            label="Message Send Sound"
            description="Play a tone when you send a message."
            value={settings.soundMessageSend}
            onChange={() => settings.toggle('soundMessageSend')}
          />
          <ToggleRow
            label="Message Receive Sound"
            description="Play a tone when you receive a message."
            value={settings.soundMessageReceive}
            onChange={() => settings.toggle('soundMessageReceive')}
          />
          <ToggleRow
            label="Voice Connect Sound"
            description="Play a tone when joining or leaving a voice channel."
            value={settings.soundVoiceConnect}
            onChange={() => settings.toggle('soundVoiceConnect')}
          />
          <ToggleRow
            label="Deafen Sound"
            description="Play a tone when deafening/undeafening."
            value={settings.soundDeafen}
            onChange={() => settings.toggle('soundDeafen')}
          />
        </section>

        <section>
          <SectionHeader title="DO NOT DISTURB" />
          <ToggleRow
            label="Suppress All Notifications"
            description="Block all desktop and sound notifications while DND is active."
            value={settings.dndSuppressAll}
            onChange={() => settings.toggle('dndSuppressAll')}
          />
          <ToggleRow
            label="Allow DMs from Friends"
            description="Still show DM notifications from your friend list while in DND."
            value={settings.dndAllowFriendDMs}
            onChange={() => settings.toggle('dndAllowFriendDMs')}
          />
        </section>
      </div>
    </main>
  );
};

export default Notifications;
