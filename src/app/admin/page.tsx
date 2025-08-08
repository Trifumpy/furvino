import { Button } from "@mui/material";
import Link from "next/link";

export default function AdminPanel() {
  return (
    <Button LinkComponent={Link} href="/admin/novels/new" variant="contained">
      Create New Novel
    </Button>
  );
}
