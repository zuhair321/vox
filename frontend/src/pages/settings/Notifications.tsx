import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import ToggleRow from '../../components/settings/ToggleRow';

const Notifications: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="settings-page">
      <BackHeader title="NOTIFICATIONS" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <section>
          <SectionHeader title="GENERAL" />
          <ToggleRow
            label="Enable Desktop Notifications"
            description="Show system notifications for new messages and calls."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Enable Notification Sounds"
            description="Play sounds for new messages and alerts."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Enable Unread Badge"
            description="Show unread count on the taskbar icon."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Enable Flash Frame"
            description="Flash the window when a notification arrives."
            value={true}
            onChange={() => {}}
          />
        </section>

        <section>
          <SectionHeader title="MESSAGES" />
          <ToggleRow
            label="All Messages"
            description="Notify for every message in channels you're active in."
            value={false}
            onChange={() => {}}
          />
          <ToggleRow
            label="@Mentions Only"
            description="Only notify when someone mentions you or your roles."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Direct Messages"
            description="Notify for every direct message received."
            value={true}
            onChange={() => {}}
          />
        </section>

        <section>
          <SectionHeader title="SOUNDS" />
          <ToggleRow
            label="Message Send Sound"
            description="Play a tone when you send a message."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Message Receive Sound"
            description="Play a tone when you receive a message."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Voice Connect Sound"
            description="Play a tone when joining or leaving a voice channel."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Deafen Sound"
            description="Play a tone when deafening/undeafening."
            value={true}
            onChange={() => {}}
          />
        </section>

        <section>
          <SectionHeader title="DO NOT DISTURB" />
          <ToggleRow
            label="Suppress All Notifications"
            description="Block all desktop and sound notifications while DND is active."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Allow DMs from Friends"
            description="Still show DM notifications from your friend list while in DND."
            value={false}
            onChange={() => {}}
          />
        </section>
      </div>
    </main>
  );
};

export default Notifications;
