function HomePage() {
  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Welcome to Retro Collections</h2>
          <p className="text-base-content/70">
            Use the navigation tabs to manage admin access, browse registered
            users, or organize your collections and items.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="font-semibold">/my-collection</h3>
            <p className="text-sm text-base-content/70">
              Create and manage your personal collectibles.
            </p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="font-semibold">/collectors</h3>
            <p className="text-sm text-base-content/70">
              Browse collectors with public profiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
