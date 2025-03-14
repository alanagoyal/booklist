export default function ContributePage() {
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-base mb-6">Contribute</h1>

        <div className="space-y-4">
          <p className="text-text/70">
            To contribute a recommendation, please email{" "}
            <a href="mailto:alana@basecase.vc" className="text-text hover:underline">
              alana@basecase.vc.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
