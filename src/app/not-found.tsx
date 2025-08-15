import * as React from 'react';
import Link from 'next/link';
import { Button, Container, Stack, Typography } from '@mui/material';
import { ErrorIcon } from '@/generic/icons';

export default function NotFound() {
  return (
    <Container component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', py: 8 }}>
      <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center', maxWidth: 640, width: '100%' }}>
        <ErrorIcon size={140} style={{ opacity: 0.9 }} />

        <Typography variant="h3" component="h1" fontWeight={700}>Page not found</Typography>
        <Typography variant="body1" color="text.secondary">
          The page you’re looking for doesn’t exist or may have moved.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" LinkComponent={Link} href="/">Go home</Button>
          <Button variant="outlined" LinkComponent={Link} href="/about">About</Button>
        </Stack>
      </Stack>
    </Container>
  );
}


