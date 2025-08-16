import z from "zod";

export const urlOrEmpty = z.union([z.url(), z.literal("")]);
