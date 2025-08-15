'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Container, Stack, Typography } from '@mui/material';
import { ErrorIcon } from '@/generic/icons';

export default function Error({ reset }: { reset: () => void }) {
  const build = process.env.NEXT_PUBLIC_COMMIT?.slice(0, 7) ?? '';

  return (
    <Container component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', py: 8 }}>
      <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center', maxWidth: 640, width: '100%' }}>
        <ErrorIcon size={140} style={{ opacity: 0.9 }} />

        <Typography variant="h3" component="h1" fontWeight={700}>Internal error</Typography>
        <Typography variant="body1" color="text.secondary">
          Something went wrong on our side. Please try again.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" onClick={() => reset()}>Try again</Button>
          <Button variant="outlined" LinkComponent={Link} href="/">Go home</Button>
        </Stack>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 4 }}>
          Error code: 500{build ? ` • build ${build}` : ''}
        </Typography>
      </Stack>
    </Container>
  );
}


