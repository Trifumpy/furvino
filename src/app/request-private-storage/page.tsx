"use client";

import { Box, Button, Card, CardContent, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { AuthorGuardClient, useUser } from "@/users/providers";
import { useState } from "react";
import { toast } from "react-toastify";
import { HardDrive as HardDriveIcon } from "lucide-react";

export default function RequestPrivateStoragePage() {
  const [sending, setSending] = useState(false);
  const { user } = useUser();
  const [useForPrivateReleases, setUseForPrivateReleases] = useState(false);
  const [useAsAlternativeUpload, setUseAsAlternativeUpload] = useState(false);
  const [storageNeeded, setStorageNeeded] = useState<number>(10);
  const [additionalComments, setAdditionalComments] = useState("");

  async function handleRequest() {
    if (storageNeeded < 1 || storageNeeded > 999) {
      toast.error("Storage needed must be between 1 and 999 GiB");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/request-private-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useForPrivateReleases,
          useAsAlternativeUpload,
          storageNeeded,
          additionalComments,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send request");
      toast.success("Request sent successfully! We'll get back to you soon.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send request";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthorGuardClient>
      <Stack gap={4} maxWidth={800} mx="auto" py={4}>
        <Stack direction="row" gap={2} alignItems="center">
          <HardDriveIcon size={32} />
          <Typography variant="h4">Request Private Storage</Typography>
        </Stack>

        <Card>
          <CardContent>
            <Stack gap={3}>
              <Typography variant="h6">What is Private Storage?</Typography>
              
              <Typography variant="body1">
                Private Storage gives you access to a dedicated STACK storage space where you can 
                securely host your visual novel files and create links to share those files. This provides:
              </Typography>
              
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body1">
                    Better control over your content distribution for private releases with custom links
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Creating links for Furvino downloads 
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Faster and more reliable uploads
                  </Typography>
                </li>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Note: This feature is currently available upon request. We will get back to you within 24 hours. 
                Your request might be denied without any reason given. Once inspected, 
                you&apos;ll receive access to your private STACK storage space in your e-mail. Be sure to check your spam as well.
              </Typography>

              <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>
                  Request Details
                </Typography>
                
                <Stack gap={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useForPrivateReleases}
                        onChange={(e) => setUseForPrivateReleases(e.target.checked)}
                      />
                    }
                    label="I plan on using private storage for hosting private releases (e.g. Patreon)"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useAsAlternativeUpload}
                        onChange={(e) => setUseAsAlternativeUpload(e.target.checked)}
                      />
                    }
                    label="I plan on using private storage as an alternative to uploading my files to Furvino"
                  />

                  <TextField
                    label="How much storage do you need? (GiB)"
                    type="number"
                    value={storageNeeded}
                    onChange={(e) => setStorageNeeded(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                    inputProps={{ min: 1, max: 999 }}
                    helperText="Enter a value between 1 and 999 GiB"
                    fullWidth
                  />

                  <TextField
                    label="Additional Comments"
                    value={additionalComments}
                    onChange={(e) => setAdditionalComments(e.target.value)}
                    placeholder="Any other information you'd like to share..."
                    multiline
                    rows={4}
                    fullWidth
                  />
                </Stack>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleRequest}
                  disabled={sending}
                  fullWidth
                >
                  {sending ? "Sending Request..." : "Request Private Storage"}
                </Button>
              </Box>

              {user && (
                <Typography variant="caption" color="text.secondary">
                  Your request will be sent from: {user.username} ({user.email})
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AuthorGuardClient>
  );
}

