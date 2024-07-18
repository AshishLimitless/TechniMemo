import mongoose from "mongoose";
import { Schema } from "mongoose";

const commentSchema = mongoose.Schema(
  {
    blog_id: {
      type: Schema.Types.ObjectId,
      ref: "blogs",
      required: true,
    },
    blog_author: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    childred: {
      type: Schema.Types.ObjectId,
      ref: "comments",
    },
    commented_by: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    isReply: {
      type: Boolean,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "comments",
    },
  },
  {
    timestamp: {
      createdAt: "commentedAt",
    },
  }
);

export default mongoose.model("comments", commentSchema);
