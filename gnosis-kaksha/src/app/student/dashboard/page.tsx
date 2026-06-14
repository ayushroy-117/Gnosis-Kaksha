'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/(auth)/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#1295D8] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1A2B4A] mb-2">Student Portal</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            disabled={isSigningOut}
          >
            Sign Out
          </Button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[#1A2B4A] mb-4">Enrolled Courses</h3>
            <p className="text-3xl font-bold text-[#1295D8]">0</p>
            <p className="text-gray-600 mt-2">No courses yet</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[#1A2B4A] mb-4">Pending Tasks</h3>
            <p className="text-3xl font-bold text-[#1295D8]">0</p>
            <p className="text-gray-600 mt-2">All caught up!</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[#1A2B4A] mb-4">Performance</h3>
            <p className="text-3xl font-bold text-[#1295D8]">—</p>
            <p className="text-gray-600 mt-2">No grades yet</p>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card className="p-8 bg-linear-to-r from-[#CDE6F7] to-[#E8F4F8]">
          <h2 className="text-2xl font-bold text-[#1A2B4A] mb-3">🚀 Coming Soon</h2>
          <p className="text-gray-700 mb-4">
            The complete student portal is being built. Soon you'll be able to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>View and manage your enrolled courses</li>
            <li>Submit and track assignments</li>
            <li>View your grades and performance</li>
            <li>Communicate with teachers</li>
            <li>Download course materials</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
