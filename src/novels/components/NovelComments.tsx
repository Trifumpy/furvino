"use client";

import { useNovel } from "../providers/ClientNovelProvider";
import { useUser } from "@/users/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { formatDateTimeUtcShort } from "@/utils/lib/dates";
import { SafeImage } from "@/generic/display";
import { Modal, ModalActions, ModalContent, ModalTitle } from "@/generic/input/Modal";
import { useState } from "react";
import { MessageSquareHeart as MessageSquareHeartIcon } from "lucide-react";

const MAX_COMMENT_LENGTH = 500;

function ReplyBox({ onSubmit, buttonBgColor, buttonTextColor }: { parentId: string; onSubmit: (text: string) => void; buttonBgColor?: string; buttonTextColor?: string }) {
  const [value, setValue] = useState("");
  return (
    <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "flex-start" }} mt={1}>
      <TextField
        fullWidth
        label="Reply"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
        size="small"
        inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
        helperText={`${value.length}/${MAX_COMMENT_LENGTH}`}
        sx={{
          '& .MuiFormHelperText-root': {
            color: buttonTextColor,
          },
        }}
      />
      <Button
        variant="contained"
        size="small"
        sx={{ height: 40, alignSelf: { sm: 'flex-start' }, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
        disabled={!value.trim()}
        onClick={() => {
          const text = value.trim();
          if (!text) return;
          onSubmit(text);
          setValue("");
        }}
      >
        Reply
      </Button>
    </Stack>
  );
}

export function NovelComments({ buttonBgColor, buttonTextColor }: { buttonBgColor?: string; buttonTextColor?: string }) {
  const { novel } = useNovel();
  const { user } = useUser();
  const { novels } = useRegistry();
  const client = useQueryClient();

  const [text, setText] = useState("");
  const [replyOpenForId, setReplyOpenForId] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["novelComments", novel?.id],
    queryFn: () => novels.getComments(novel!.id, { limit: 15, replies: 10 }),
    enabled: !!novel,
  });
  const [isOpenAll, setIsOpenAll] = useState(false);
  const [replyOpenForIdAll, setReplyOpenForIdAll] = useState<string | null>(null);
  const allCommentsQuery = useQuery({
    queryKey: ["novelCommentsAll", novel?.id],
    queryFn: () => novels.getComments(novel!.id, { limit: 1000, replies: 50 }),
    enabled: !!novel && isOpenAll,
  });

  const addComment = useMutation({
    mutationFn: (payload: { novelId: string; text: string; parentId?: string }) =>
      novels.addComment(payload.novelId, { text: payload.text, parentId: payload.parentId }),
    onSuccess: () => {
      setText("");
      client.invalidateQueries({ queryKey: ["novelComments", novel?.id] });
      client.invalidateQueries({ queryKey: ["novelCommentsAll", novel?.id] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: (payload: { novelId: string; commentId: string }) =>
      novels.deleteComment(payload.novelId, payload.commentId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["novelComments", novel?.id] });
      client.invalidateQueries({ queryKey: ["novelCommentsAll", novel?.id] });
    },
  });

  if (!novel) return null;

  const comments = commentsQuery.data ?? [];

  return (
    <Stack gap={2}>
      <Stack direction="row" alignItems="center" gap={1}>
        <MessageSquareHeartIcon size={20} />
        <Typography variant="h6">Comments</Typography>
      </Stack>
      {user && (
        <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
          <TextField
            fullWidth
            label="Add a comment"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            size="small"
            inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
            helperText={`${text.length}/${MAX_COMMENT_LENGTH}`}
            sx={{
              '& .MuiFormHelperText-root': {
                color: buttonTextColor,
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            sx={{ height: 40, alignSelf: { sm: 'flex-start' }, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
            disabled={!text.trim() || addComment.isPending}
            onClick={() => addComment.mutate({ novelId: novel.id, text: text.trim() })}
          >
            Post
          </Button>
        </Stack>
      )}
      <Stack gap={2}>
        {comments.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No comments yet. Be the first to comment!
          </Typography>
        )}
        {comments.map((c) => {
          const isAuthor = !!c.user.authorId && c.user.authorId === novel.author.id;
          const canDelete = !!user && (
            user.id === c.user.id ||
            user.roles?.includes("admin") ||
            (!!user.authorId && user.authorId === novel.author.id)
          );
          return (
            <Stack key={c.id} direction="row" gap={2} alignItems="flex-start">
              <Box sx={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}>
                <SafeImage
                  src={c.user.avatarUrl || "https://placehold.co/64x64?text=?"}
                  alt={`${c.user.username}'s avatar`}
                  width={40}
                  height={40}
                  sizes="40px"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <Stack gap={0.5} sx={{ flex: 1 }}>
                <Stack direction={{ xs: "column", sm: "row" }} gap={{ xs: 0, sm: 1 }} alignItems={{ xs: "flex-start", sm: "center" }}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="subtitle2">{c.user.username}</Typography>
                    {isAuthor && <Chip label="Author" size="small" color="secondary" />}
                  </Stack>
                  <Typography variant="caption" sx={{ mt: { xs: 0.25, sm: 0 } }}>{formatDateTimeUtcShort(c.createdAt)}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word', ml: { xs: -7, sm: 0 } }}>{c.text}</Typography>
                {user && (
                  <Stack direction="row" gap={1} alignItems="center" mt={0.5} sx={{ ml: { xs: -7, sm: 0 } }}>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                      onClick={() => setReplyOpenForId((prev) => (prev === c.id ? null : c.id))}
                    >
                      {replyOpenForId === c.id ? "Cancel" : "Reply"}
                    </Button>
                    {canDelete && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                        onClick={() => {
                          if (window.confirm('Delete this comment? This cannot be undone.')) {
                            deleteComment.mutate({ novelId: novel.id, commentId: c.id });
                          }
                        }}
                        disabled={deleteComment.isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </Stack>
                )}
                {user && replyOpenForId === c.id && (
                  <Box sx={{ ml: { xs: -7, sm: 0 } }}>
                    <ReplyBox
                      buttonBgColor={buttonBgColor}
                      buttonTextColor={buttonTextColor}
                      parentId={c.id}
                      onSubmit={(replyText) => {
                        addComment.mutate({ novelId: novel.id, text: replyText, parentId: c.id });
                        setReplyOpenForId(null);
                      }}
                    />
                  </Box>
                )}
                {c.replies && c.replies.length > 0 && (
                  <Stack gap={2} mt={1} ml={-7} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
                    {c.replies.map((r) => {
                      const rIsAuthor = !!r.user.authorId && r.user.authorId === novel.author.id;
                      const rCanDelete = !!user && (
                        user.id === r.user.id ||
                        user.roles?.includes("admin") ||
                        (!!user.authorId && user.authorId === novel.author.id)
                      );
                      return (
                        <Stack key={r.id} direction="row" gap={2} alignItems="flex-start">
                          <Box sx={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden" }}>
                            <SafeImage
                              src={r.user.avatarUrl || "https://placehold.co/64x64?text=?"}
                              alt={`${r.user.username}'s avatar`}
                              width={32}
                              height={32}
                              sizes="32px"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </Box>
                          <Stack gap={0.5} sx={{ flex: 1 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} gap={{ xs: 0, sm: 1 }} alignItems={{ xs: "flex-start", sm: "center" }}>
                              <Stack direction="row" gap={1} alignItems="center">
                                <Typography variant="subtitle2">{r.user.username}</Typography>
                                {rIsAuthor && <Chip label="Author" size="small" color="secondary" />}
                              </Stack>
                              <Typography variant="caption" sx={{ mt: { xs: 0.25, sm: 0 } }}>{formatDateTimeUtcShort(r.createdAt)}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word', ml: { xs: -6, sm: 0 } }}>{r.text}</Typography>
                            {user && (
                              <Stack direction="row" gap={1} alignItems="center" mt={0.5} sx={{ ml: { xs: -6, sm: 0 } }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                                  onClick={() => setReplyOpenForId((prev) => (prev === c.id ? null : c.id))}
                                >
                                  {replyOpenForId === c.id ? "Cancel" : "Reply"}
                                </Button>
                                {rCanDelete && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                                    onClick={() => {
                                      if (window.confirm('Delete this reply? This cannot be undone.')) {
                                        deleteComment.mutate({ novelId: novel.id, commentId: r.id });
                                      }
                                    }}
                                    disabled={deleteComment.isPending}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </Stack>
                            )}
                          </Stack>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
      {comments.length >= 15 && (
        <Stack alignItems="center" mt={1}>
          <Button variant="text" size="small" onClick={() => setIsOpenAll(true)}>View more comments</Button>
        </Stack>
      )}

      <Modal isOpen={isOpenAll} close={() => setIsOpenAll(false)} maxWidth="md" fullWidth>
        <ModalTitle>All comments</ModalTitle>
        <ModalContent>
          <Stack gap={2}>
            {(allCommentsQuery.data ?? comments).map((c) => {
              const isAuthor = !!c.user.authorId && c.user.authorId === novel.author.id;
              const canDelete = !!user && (
                user.id === c.user.id ||
                user.roles?.includes("admin") ||
                (!!user.authorId && user.authorId === novel.author.id)
              );
              return (
                <Stack key={`all-${c.id}`} direction="row" gap={2} alignItems="flex-start">
                  <Box sx={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}>
                    <SafeImage
                      src={c.user.avatarUrl || "https://placehold.co/64x64?text=?"}
                      alt={`${c.user.username}'s avatar`}
                      width={40}
                      height={40}
                      sizes="40px"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </Box>
                  <Stack gap={0.5} sx={{ flex: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={{ xs: 0, sm: 1 }} alignItems={{ xs: "flex-start", sm: "center" }}>
                      <Stack direction="row" gap={1} alignItems="center">
                        <Typography variant="subtitle2">{c.user.username}</Typography>
                        {isAuthor && <Chip label="Author" size="small" color="secondary" />} 
                      </Stack>
                      <Typography variant="caption" sx={{ mt: { xs: 0.25, sm: 0 } }}>{formatDateTimeUtcShort(c.createdAt)}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word', ml: { xs: -7, sm: 0 } }}>{c.text}</Typography>
                    {user && (
                      <Stack direction="row" gap={1} alignItems="center" mt={0.5} sx={{ ml: { xs: -7, sm: 0 } }}>
                        <Button
                            size="small"
                            variant="contained"
                            sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                          onClick={() => setReplyOpenForIdAll((prev) => (prev === c.id ? null : c.id))}
                        >
                          {replyOpenForIdAll === c.id ? "Cancel" : "Reply"}
                        </Button>
                        {canDelete && (
                          <Button
                              size="small"
                              variant="contained"
                              sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                            onClick={() => {
                              if (window.confirm('Delete this comment? This cannot be undone.')) {
                                deleteComment.mutate({ novelId: novel.id, commentId: c.id });
                              }
                            }}
                            disabled={deleteComment.isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </Stack>
                    )}
                    {user && replyOpenForIdAll === c.id && (
                      <Box sx={{ ml: { xs: -7, sm: 0 } }}>
                        <ReplyBox
                          buttonBgColor={buttonBgColor}
                          buttonTextColor={buttonTextColor}
                          parentId={c.id}
                          onSubmit={(replyText) => {
                            addComment.mutate({ novelId: novel.id, text: replyText, parentId: c.id });
                            setReplyOpenForIdAll(null);
                          }}
                        />
                      </Box>
                    )}
                    {c.replies && c.replies.length > 0 && (
                      <Stack gap={2} mt={1} ml={-7} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
                        {c.replies.map((r) => {
                          const rCanDelete = !!user && (
                            user.id === r.user.id ||
                            user.roles?.includes("admin") ||
                            (!!user.authorId && user.authorId === novel.author.id)
                          );
                          return (
                            <Stack key={`all-${r.id}`} direction="row" gap={2} alignItems="flex-start">
                              <Box sx={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden" }}>
                                <SafeImage
                                  src={r.user.avatarUrl || "https://placehold.co/64x64?text=?"}
                                  alt={`${r.user.username}'s avatar`}
                                  width={32}
                                  height={32}
                                  sizes="32px"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </Box>
                              <Stack gap={0.5} sx={{ flex: 1 }}>
                                <Stack direction={{ xs: "column", sm: "row" }} gap={{ xs: 0, sm: 1 }} alignItems={{ xs: "flex-start", sm: "center" }}>
                                  <Typography variant="subtitle2">{r.user.username}</Typography>
                                  <Typography variant="caption" sx={{ mt: { xs: 0.25, sm: 0 } }}>{formatDateTimeUtcShort(r.createdAt)}</Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word', ml: { xs: -6, sm: 0 } }}>{r.text}</Typography>
                                {rCanDelete && (
                                  <Stack direction="row" gap={1} alignItems="center" mt={0.5} sx={{ ml: { xs: -6, sm: 0 } }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{ height: 32, bgcolor: buttonBgColor, color: buttonTextColor, '&:hover': { bgcolor: buttonBgColor } }}
                                      onClick={() => {
                                        if (window.confirm('Delete this reply? This cannot be undone.')) {
                                          deleteComment.mutate({ novelId: novel.id, commentId: r.id });
                                        }
                                      }}
                                      disabled={deleteComment.isPending}
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                )}
                              </Stack>
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </ModalContent>
        <ModalActions close={() => setIsOpenAll(false)} />
      </Modal>
    </Stack>
  );
}


