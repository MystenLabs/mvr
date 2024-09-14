
const Social = [
    {
        name: 'Discord',
        url: 'https://discord.com/invite/sui',
    },
    {
        name: 'Youtube',
        url: 'https://www.youtube.com/@Sui-Network',
    },
    {
        name: 'X',
        url: 'https://twitter.com/SuiNetwork',
    },
    {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com/company/sui-foundation/',
    },
];

export default function Footer() {
    return (
        <footer className="border-t border-content-primary/15 ">
            <div className="container py-Regular grid lg:grid-cols-2 gap-5 items-center">
                <div>
                    <p className="font-mono text-sm text-content-tertiary -indent-6 uppercase">
                        © 2024 Sui foundation. All rights reserved.
                    </p>
                </div>
                <div className="flex justify-end">

                </div>
            </div>

        </footer>
    )
}
