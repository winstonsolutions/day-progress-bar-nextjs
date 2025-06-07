import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const authObject = await auth();
  const user = await currentUser();

  if (!authObject.userId || !user) {
    redirect("/sign-in");
  }

  // 从用户对象中安全地提取值
  const email = user.emailAddresses?.[0]?.emailAddress || "";
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Extension Settings</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Email</p>
                <p>{email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Name</p>
                <p>{firstName} {lastName}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Extension ID</h3>
            <p className="text-sm text-gray-600 mb-2">
              Your extension ID is needed for direct communication between the web dashboard and the Chrome extension.
            </p>

            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                name="extensionId"
                id="extensionId"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your extension ID"
              />
              <button
                type="button"
                className="ml-3 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save
              </button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="auto-sync"
                    name="auto-sync"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="auto-sync" className="font-medium text-gray-700">
                    Auto-sync settings
                  </label>
                  <p className="text-gray-500">Automatically sync your settings between devices</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="notifications"
                    name="notifications"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notifications" className="font-medium text-gray-700">
                    Enable notifications
                  </label>
                  <p className="text-gray-500">Receive notifications about your progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}