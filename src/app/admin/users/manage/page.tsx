"use client";

import { AdminGuardClient } from "../../AdminGuardClient";
import { Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRegistry } from "@/utils/client";
import { useSearchUsers } from "@/novels/hooks";
import { PublicUser } from "@/contracts/users";
import { toast } from "react-toastify";
import { Modal, ModalTitle, ModalContent, ModalActions } from "@/generic/input/Modal";
import { useModal } from "@/generic/hooks/useModal";

export default function ManageUsersPage() {
  const { users } = useRegistry();
  const [selected, setSelected] = useState<PublicUser | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stackName, setStackName] = useState("");
  const [stackUsername, setStackUsername] = useState("");
  const [stackPassword, setStackPassword] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const emailModal = useModal();

  const { users: results, onSearch } = useSearchUsers();

  useEffect(() => {
    onSearch(search);
  }, [search, onSearch]);

  useEffect(() => {
    if (selected) {
      setStackName(selected.stackName || "");
      setStackUsername("");
      setStackPassword("");
      // Default email template
      setEmailTemplate(
        `<p>Dear ${selected.username},</p>\n\n` +
        `<p>Your private STACK storage has been set up! You can now access your storage space at <a href="https://stack.furvino.com/en/login">stack.furvino.com</a>.</p>\n\n` +
        `<p><strong>Your login credentials:</strong></p>\n` +
        `<p>Username: {{username}}<br/>\n` +
        `Password: {{password}}</p>\n\n` +
        `<p>Please keep these credentials safe and set up 2 factor authentication. You can change your password after logging in. </p>\n\n` +
        `<p>You can also access your account in the author menu! <br/>\n` +
        `<p> <br/>\n` +
        `<p>With kind regards,<br/>\n` +
        `The Furvino Team</p>`
      );
    }
  }, [selected]);

  const displayed = useMemo(() => {
    if (!search.trim()) {
      return [...results]
        .sort((a, b) => new Date(b.createdAt as unknown as string).getTime() - new Date(a.createdAt as unknown as string).getTime())
        .slice(0, 20);
    }
    return results;
  }, [results, search]);

  async function updateModeration(patch: Partial<Pick<PublicUser, 'banCommentingAndRating' | 'banAuthorCreation'>>) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await users.updateModeration(selected.id, patch);
      setSelected(updated);
      toast.success('Updated moderation');
    } catch {
      toast.error('Failed to update moderation');
    } finally {
      setSaving(false);
    }
  }

  async function unassignAuthor() {
    if (!selected) return;
    setBusy(true);
    try {
      await users.unassignAuthor(selected.id);
      setSelected({ ...selected, authorId: null });
      toast.success('Author unassigned');
    } catch {
      toast.error('Failed to unassign');
    } finally {
      setBusy(false);
    }
  }

  async function unassignAndRemoveAuthor() {
    if (!selected) return;
    const ok = window.confirm('Unassign user and delete their Author (only if they have no novels)?');
    if (!ok) return;
    setBusy(true);
    try {
      await users.unassignAndRemoveAuthor(selected.id);
      setSelected({ ...selected, authorId: null });
      toast.success('Author removed');
    } catch {
      toast.error('Failed to remove author (ensure they have no novels)');
    } finally {
      setBusy(false);
    }
  }

  async function updateStackName() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await users.assignStackName(selected.id, stackName || null);
      setSelected(updated);
      toast.success('STACK name updated');
    } catch {
      toast.error('Failed to update STACK name');
    } finally {
      setSaving(false);
    }
  }

  function openEmailModal() {
    emailModal.open();
  }

  async function assignAndEmail() {
    if (!selected) return;
    if (!stackUsername.trim() || !stackPassword.trim()) {
      toast.error('Please fill in STACK username and password');
      return;
    }
    
    // Use stackUsername as stackName if stackName is not provided
    const finalStackName = stackName.trim() || stackUsername.trim();
    
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${selected.id}/stack/assign-with-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stackName: finalStackName,
          stackUsername,
          stackPassword,
          emailTemplate,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Failed to assign and email');
      setSelected(json);
      setStackName(finalStackName);
      // Clear sensitive fields to prevent browser from offering to save
      setStackUsername("");
      setStackPassword("");
      toast.success('STACK assigned and email sent to user');
      emailModal.close();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign and email';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuardClient>
      <Stack gap={3}>
        <Typography variant="h5">Manage Users</Typography>
        <TextField label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type username" />
        <Stack direction="row" gap={1} flexWrap="wrap">
          {displayed.map((u) => (
            <Button key={u.id} variant={selected?.id === u.id ? 'contained' : 'outlined'} onClick={() => setSelected(u)}>
              {u.username}
            </Button>
          ))}
        </Stack>
        {selected && (
          <Stack gap={2} sx={{ maxWidth: 520 }}>
            <Typography variant="subtitle1">User: {selected.username}</Typography>
            <Stack>
              <FormControlLabel
                control={<Checkbox
                  checked={!!selected.banCommentingAndRating}
                  onChange={async (e) => {
                    await updateModeration({ banCommentingAndRating: e.target.checked });
                  }}
                  disabled={saving}
                />}
                label="Ban commenting and rating"
              />
              <FormControlLabel
                control={<Checkbox
                  checked={!!selected.banAuthorCreation}
                  onChange={async (e) => {
                    await updateModeration({ banAuthorCreation: e.target.checked });
                  }}
                  disabled={saving}
                />}
                label="Ban author creation"
              />
            </Stack>
            <Stack gap={1}>
              <Typography variant="subtitle2">STACK Storage</Typography>
              <TextField
                label="STACK Name"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                placeholder="Enter STACK name"
                size="small"
                fullWidth
                disabled={saving}
                autoComplete="off"
              />
              {selected.stackName && (
                <Typography variant="caption" color="text.secondary">
                  Current: {selected.stackName}
                </Typography>
              )}
              <Stack direction="row" gap={1}>
                <Button onClick={updateStackName} disabled={saving} variant="contained" size="small">
                  Assign
                </Button>
                <Button onClick={openEmailModal} disabled={saving} variant="contained" color="secondary" size="small">
                  Assign & Email User
                </Button>
              </Stack>
            </Stack>
            <Stack direction="row" gap={1}>
              <Button onClick={unassignAuthor} disabled={busy || !selected.authorId} variant="outlined">Unassign author</Button>
              <Button onClick={unassignAndRemoveAuthor} color="error" disabled={busy || !selected.authorId} variant="outlined">Unassign + Remove author</Button>
            </Stack>
          </Stack>
        )}
      </Stack>

      <Modal
        isOpen={emailModal.isOpen}
        close={emailModal.close}
        onSubmit={(e) => {
          e.preventDefault();
          assignAndEmail();
        }}
        maxWidth="md"
        fullWidth
      >
        <ModalTitle>Assign STACK Storage & Email User</ModalTitle>
        <ModalContent>
          <Stack gap={2}>
            <Typography variant="body2" color="text.secondary">
              Enter the STACK credentials and customize the email template. Use {'{{username}}'} and {'{{password}}'} placeholders in your template.
            </Typography>
            
            {/* Hidden dummy fields to prevent password autofill and saving */}
            <input type="text" autoComplete="off" style={{ display: 'none' }} aria-hidden="true" />
            <input type="password" autoComplete="new-password" style={{ display: 'none' }} aria-hidden="true" />
            
            <TextField
              label="STACK Username"
              value={stackUsername}
              onChange={(e) => setStackUsername(e.target.value)}
              placeholder="Enter STACK username"
              size="small"
              fullWidth
              required
              autoComplete="off"
              name="stack-username-field"
              inputProps={{ 'data-form-type': 'other' }}
            />
            
            <TextField
              label="STACK Password"
              value={stackPassword}
              onChange={(e) => setStackPassword(e.target.value)}
              placeholder="Enter STACK password"
              type="password"
              size="small"
              fullWidth
              required
              autoComplete="new-password"
              name="stack-password-field"
              inputProps={{ 'data-form-type': 'other' }}
            />

            <TextField
              label="Email Template (HTML)"
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              placeholder="Enter email template"
              multiline
              rows={12}
              fullWidth
              required
              autoComplete="off"
            />
          </Stack>
        </ModalContent>
        <ModalActions
          submitAction="Assign & Send Email"
          loading={saving}
          disabled={saving || !stackUsername.trim() || !stackPassword.trim() || !emailTemplate.trim()}
          close={emailModal.close}
        />
      </Modal>
    </AdminGuardClient>
  );
}


