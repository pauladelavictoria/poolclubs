export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-1 px-1">
        
        {children}
      </div>
    </div>
  );
}
