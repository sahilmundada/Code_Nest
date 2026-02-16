"use server";

import Roadmap from "../models/roadmapModel";
import User from "../models/userModel";
import { connect } from "../mongodb/mongoose";
import { Groq } from 'groq-sdk';
const axios = require('axios');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper function to validate API key
const validateApiKey = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }
};

// Helper function to validate roadmap content
const validateRoadmapContent = (content) => {
  if (!content || !content.steps || !Array.isArray(content.steps)) {
    throw new Error("Invalid roadmap format: missing steps array");
  }
  return content;
};

const getVideoDuration = async (videoId) => {
  try {
    // Check if YouTube API key is configured
    if (!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY) {
      console.log("YouTube API key not configured, skipping video duration check");
      return null;
    }

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: "contentDetails",
        id: videoId,
        key: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
      },
    });

    if (response.data.items && response.data.items.length > 0) {
      const duration = response.data.items[0].contentDetails.duration; // Returns in ISO 8601 format
      // Convert ISO 8601 duration to minutes
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      const hours = (match[1] ? parseInt(match[1]) : 0);
      const minutes = (match[2] ? parseInt(match[2]) : 0);
      const seconds = (match[3] ? parseInt(match[3]) : 0);
      
      const totalMinutes = hours * 60 + minutes + seconds / 60;
      return { duration, totalMinutes };
    }
    return null;
  } catch (error) {
    console.error("Error getting video duration:", error);
    return null;
  }
};

const searchYouTubeVideo = async (topic) => {
  try {
    // Check if YouTube API key is configured
    if (!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY) {
      console.log("YouTube API key not configured, skipping video search");
      return null;
    }

    // Search for videos with duration filter (only long videos)
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: "snippet",
        maxResults: 5, // Increased to have more options to filter
        order: "relevance",
        q: topic,
        type: "video",
        videoDuration: "medium", // Filter for medium length videos
        key: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
      },
    });
    
    if (response.data.items && response.data.items.length > 0) {
      // Check each video's duration until we find one that's at least 10 minutes
      for (const item of response.data.items) {
        const videoId = item.id.videoId;
        const durationInfo = await getVideoDuration(videoId);
        
        if (durationInfo && durationInfo.totalMinutes >= 10) {
          return {
            videoId,
            duration: durationInfo.duration
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error searching YouTube video:", error);
    // Return null instead of throwing error to allow roadmap creation to continue
    return null;
  }
};

const generateRoadmap = async (prompt) => {
  validateApiKey();

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Create a detailed learning roadmap in JSON format. Break down the learning path into steps, where each step represents a topic to master. Include a description of what to learn in each step (atleast 5 steps) and relevant documentation links. The format should be: { 'steps': [{ 'step': 1, 'topic': 'string', 'description': 'string', 'documentation': 'string' }] }"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-groq-70b-8192-tool-use-preview",
      temperature: 0.5,
      max_tokens: 800,
      top_p: 0.65,
      stream: false,
      stop: null
    });

    if (!chatCompletion?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from Groq API");
    }

    const roadmapContent = chatCompletion.choices[0].message.content
      .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')
      .replace(/'/g, '"');

    const parsedContent = JSON.parse(roadmapContent);
    const validatedContent = validateRoadmapContent(parsedContent);

    // Add video IDs and durations for each step
    const stepsWithVideos = await Promise.all(
      validatedContent.steps.map(async (step) => {
        try {
          const searchQuery = `${step.topic} programming tutorial`;
          const videoInfo = await searchYouTubeVideo(searchQuery);
          return {
            ...step,
            videoId: videoInfo?.videoId || '',
            videoDuration: videoInfo?.duration || '',
            completionCount: 0
          };
        } catch (error) {
          console.error(`Error adding video for step ${step.step}:`, error);
          return {
            ...step,
            videoId: '',
            videoDuration: '',
            completionCount: 0
          };
        }
      })
    );

    return {
      steps: stepsWithVideos
    };
  } catch (error) {
    console.error("Error in generateRoadmap:", error);
    throw new Error(`Failed to generate roadmap: ${error.message}`);
  }
};

export const createRoadmap = async (title, prompt, author) => {
  try {
    await connect();
    
    const user = await User.findOne({ clerkId: author });
    if (!user) {
      throw new Error("User not found");
    }

    const content = await generateRoadmap(prompt);
    if (!content) {
      throw new Error("Failed to generate roadmap content");
    }

    const roadmap = await Roadmap.create({
      title,
      prompt,
      content,
      author: user.userName,
    });

    return roadmap.toObject();
  } catch (error) {
    console.error("Error in createRoadmap:", error);
    throw new Error(`Failed to create roadmap: ${error.message}`);
  }
};

export const getUserRoadmaps = async (author) => {
  try {
    await connect();
    const user = await User.findOne({ clerkId: author });
    if (!user) throw new Error("User not found");

    const roadmaps = await Roadmap.find({ author: user.userName }).sort({ createdAt: -1 });
    
    // Calculate progress for each roadmap
    const roadmapsWithProgress = roadmaps.map(roadmap => {
      const totalSteps = roadmap.content.steps.length;
      const completedSteps = roadmap.content.steps.filter(step => step.completionCount > 0).length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      
      return {
        ...roadmap.toObject(),
        progress
      };
    });

    return JSON.parse(JSON.stringify(roadmapsWithProgress)); // Convert to plain object
  } catch (error) {
    console.error("Error fetching roadmaps:", error);
    throw error;
  }
};

export const getRoadmapById = async (id) => {
  try {
    await connect();
    const roadmap = await Roadmap.findById(id);
    if (!roadmap) return null;
    return JSON.parse(JSON.stringify(roadmap)); // Convert to plain object
  } catch (error) {
    console.error("Error getting roadmap:", error);
    throw error;
  }
};

export const updateStepStatus = async (roadmapId, stepNumber) => {
  try {
    await connect();
    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) throw new Error("Roadmap not found");

    // Find and update the step completion count
    const step = roadmap.content.steps.find(s => s.step === stepNumber);
    if (!step) throw new Error("Step not found");
    
    // Set completion count to 1 if it's not already completed
    if (!step.completionCount) {
      step.completionCount = 1;
      // Save the entire roadmap to ensure all steps are preserved
      await roadmap.save();
    }
    
    // Return the entire roadmap to maintain all step states
    const updatedRoadmap = await Roadmap.findById(roadmapId);
    return JSON.parse(JSON.stringify(updatedRoadmap));
  } catch (error) {
    console.error("Error updating step status:", error);
    throw error;
  }
};
