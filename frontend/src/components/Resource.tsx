export function Resource() {
    const Card = ({
      icon,
      title,
      description,
      href,
    }: {
      icon: string
      title: string
      description: string
      href: string
    }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-5 hover:bg-white hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white border border-gray-200 text-xl">
          {icon}
        </div>
  
        <div>
          <div className="text-base font-semibold text-gray-900">
            {title}
          </div>
          <div className="text-sm text-gray-500">
            {description}
          </div>
        </div>
      </a>
    )
  
    return (
      <div className="space-y-12">
  
        {/* Project Overview */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📘 Gonka Project Overview
          </h2>
          <p className="text-gray-600 leading-relaxed text-base">
            Gonka is a decentralized network for high-efficiency AI compute —
            run by those who run it. It functions as a cost-effective and efficient
            alternative to centralized cloud services for AI model training and
            inference. As a protocol, it's not a company or a start-up.
          </p>
        </div>
  
        {/* Official Resources */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Official Resources
          </h2>
  
          <div className="grid md:grid-cols-3 gap-6">
            <Card
              icon="🌐"
              title="Official Website"
              description="gonka.ai"
              href="https://gonka.ai/"
            />
  
            <Card
              icon="📄"
              title="Tokenomics"
              description="Project tokenomics"
              href="https://gonka.ai/tokenomics.pdf"
            />
  
            <Card
              icon="📄"
              title="Whitepaper"
              description="Technical documentation"
              href="https://gonka.ai/whitepaper.pdf"
            />
  
            <Card
              icon="💬"
              title="Discord"
              description="Official Discord server"
              href="https://discord.com/invite/RADwCT2U6R"
            />
  
            <Card
              icon="🐦"
              title="X (Twitter)"
              description="Official account"
              href="https://x.com/gonka_ai"
            />
  
            <Card
              icon="💻"
              title="GitHub"
              description="Project source code"
              href="https://github.com/gonka-ai/gonka"
            />
          </div>
        </div>
  
        {/* Developer Resources */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Developer Resources
          </h2>
  
          <div className="grid md:grid-cols-3 gap-6">
            <Card
              icon="📚"
              title="Developer Quickstart"
              description="Official guide explaining how to create a developer account and send your first Gonka API request."
              href="https://gonka.ai/developer/quickstart/"
            />
  
            <Card
              icon="🪙"
              title="Test GNK Faucet"
              description="Get test GNK to pay for your initial inference requests."
              href="https://gnk.space/faucet"
            />
  
            <Card
              icon="🧩"
              title="GonkaAI Gateway"
              description="Community proxy providing an OpenAI-compatible inference API with GNK-based billing."
              href="https://gonka-gateway.mingles.ai/"
            />
  
            <Card
              icon="🎮"
              title="GonkaGate"
              description="Community gateway with free credits on signup and a Chat Playground to test models without code."
              href="https://gonkagate.com/"
            />
          </div>
        </div>
      </div>
    )
  }