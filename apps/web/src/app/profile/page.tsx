import { requireAuth } from '@/lib/auth-helpers'
import { ProfileForm } from '@/components/profile-form'
import { UserStats } from '@/components/user-stats'

export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <ProfileForm initialData={{ 
                email: user.email || '', 
                name: user.name 
              }} />
            </div>
          </div>
          
          <div>
            <UserStats />
          </div>
        </div>
      </div>
    </div>
  )
}