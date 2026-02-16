import mongoose from "mongoose";

const roadmapSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  content: {
    steps: [{
      step: {
        type: Number,
        required: true
      },
      topic: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      documentation: {
        type: String,
        default: ''
      },
      videoId: {
        type: String,
        default: ''
      },
      videoDuration: {
        type: String,
        default: ''
      },
      completionCount: {
        type: Number,
        default: 0
      }
    }]
  },
  author: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Roadmap = mongoose.models.Roadmap || mongoose.model("Roadmap", roadmapSchema);

export default Roadmap;
