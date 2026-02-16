"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaYoutube } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";
import { getRoadmapById, updateStepStatus } from "@/lib/actions/roadmap";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";


// Function to format duration from ISO 8601
const formatDuration = (duration) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  let formatted = "";
  if (hours) formatted += `${hours}h `;
  if (minutes) formatted += `${minutes}m `;
  if (seconds && !hours) formatted += `${seconds}s`;
  return formatted.trim();
};

// Function to sanitize URL
const sanitizeUrl = (url) => {
  // Remove angle brackets and any surrounding whitespace
  return url.replace(/[<>]/g, '').trim();
};

const handleMarkCompleted = async (stepNumber) => {
  try {
    setUpdating(true);
    // Call your API to mark it as complete (implement this if needed)
    // await axios.post(`/api/updateStepStatus`, { roadmapId, stepNumber });

    // Optimistically update UI
    setCompletedSteps((prev) => new Set(prev).add(stepNumber));
  } catch (error) {
    console.error("Error marking step as completed:", error);
  } finally {
    setUpdating(false);
  }
};


export default function RoadmapDetailPage() {
  const params = useParams();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const data = await getRoadmapById(params.id);
        setRoadmap(data);
        // Initialize completed steps from the roadmap data
        const completed = new Set(
          data.content.steps
            .filter(step => step.completionCount > 0)
            .map(step => step.step)
        );
        setCompletedSteps(completed);
      } catch (error) {
        console.error("Error fetching roadmap:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRoadmap();
    }
  }, [params.id]);

  const handleMarkCompleted = async (stepNumber) => {
    try {
      setUpdating(true);
      
      // Update local state first
      setCompletedSteps(prev => {
        const newSet = new Set(prev);
        newSet.add(stepNumber);
        return newSet;
      });

      // Update the database
      const updatedRoadmap = await updateStepStatus(params.id, stepNumber);
      
      // Update roadmap state with server response
      setRoadmap(updatedRoadmap);
      
      // Trigger dashboard update
      const event = new CustomEvent('roadmapStepCompleted', {
        detail: { roadmapId: params.id, stepNumber }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating step status:", error);
      // Revert local state on error
      setCompletedSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepNumber);
        return newSet;
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Roadmap Not Found</h1>
          <p className="text-gray-600">The roadmap you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#101826] to-[#1c2c47] px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-bold text-white mb-2">{roadmap.title}</h1>
            <p className="text-blue-100">{roadmap.prompt}</p>
          </div>

          {/* Steps */}
          <div className="px-6 py-8 sm:px-8">
            <div className="space-y-8">
              {roadmap.content.steps.map((step, index) => (
                <div
                  key={step.step}
                  className="relative pl-8 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-blue-200"
                >
                  {/* Step number bubble */}
                  <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Step {step.step}: {step.topic}
                    </h3>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    
                    <div className="flex flex-wrap gap-4">
                      {step.documentation && (
                        <a
                          href={sanitizeUrl(step.documentation)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <FiExternalLink className="text-lg" />
                          <span>Documentation</span>
                        </a>
                      )}
                      
                      {step.videoId && (
                        <a
                          href={`/learn/${step.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <FaYoutube className="text-lg" />
                          <span>Tutorial ({formatDuration(step.videoDuration)})</span>
                        </a>
                      )}
                      
                      <Button
                        variant={completedSteps.has(step.step) ? "outline" : "default"}
                        size="sm"
                        className={`gap-2 ${
                          completedSteps.has(step.step)
                            ? 'bg-green-50 text-green-800 hover:bg-green-800 border-green-800' 
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                        onClick={() => handleMarkCompleted(step.step)}
                        disabled={updating || completedSteps.has(step.step)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {completedSteps.has(step.step) ? 'Completed' : 'Mark as Completed'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
