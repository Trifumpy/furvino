// src/app/about/page.tsx
import { Typography, Stack, Link, Divider, Box } from "@mui/material";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Contact</Typography>
      <Typography>
        For quick Author verification DM me your Furvino username from you novel Twitter / BSKY account. <br />
        Twitter / X:
        {" "}
        <Link href= "https://x.com/Trifumpy" target="_blank" rel="noopener">@Trifumpy</Link> <br />        
        BlueSky:
        {" "}
        <Link href= "https://bsky.app/profile/trifumpy.bsky.social" target="_blank" rel="noopener">@Trifumpy</Link> <br />
      </Typography>
      <Box mt={4} />
      <Typography>
        If you want to get an Author account, you have any questions, suggestions, want novels to be added or anything else? Below are a few different ways you can contact me: <br />
        Discord server: 
        {" "}
        <Link href= "https://discord.gg/HJhHDXbeqn" target="_blank" rel="noopener">Furvino</Link> <br />
        Telegram:
        {" "}
        <Link href= "https://t.me/Trifumpy" target="_blank" rel="noopener">@Trifumpy</Link> <br />
      Discord:
      {" "}
      <Link href= "https://discord.com/users/216949212540174336" target="_blank" rel="noopener">@Trifumpy</Link><br /> 
      </Typography>
      <Box mt={4} />
      
      <Typography>
        If you want to contact me on more serious matters like takedown requests, cooperation and more, please use the email below: <br />
        Email:
        {" "}
        <Link href="mailto:furvino.com@gmail.com" target="_blank" rel="noopener">furvino.com@gmail.com</Link>
      </Typography>
      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h4" sx={{ mt: 4 }}>About</Typography>
      <Typography>
        I want furries to discover and download all furry visual novels for free, with no ads, censorship as well as giving space for creators to publish their work without hassle for free and all in one place.
      </Typography>
      <Typography>
        My long term goal with this website is to create a platform where creators get a full amount from what you donated (excluding payment processing fees).<br/>
        Another goal for me would be that the users can choose to enable advertisements deployed on the website and all of the revenue from these ads would go to support a charity that the community chooses!  
      </Typography>
      <Typography>
        Massive thank you to Ender for guidance, advice, setup and developing most of this website! 💙 <br />
      You can contact him on Discord here:
      {" "}
      <Link href= "https://discord.com/users/234625299625672704" target="_blank" rel="noopener">@enderfloof</Link>     
      </Typography>

      <Typography>
      This project is open-source. Check the code here: <Link href= "https://github.com/Trifumpy/furvino" target="_blank" rel="noopener">Github</Link>
      </Typography>
      
      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h4" sx={{ mt: 4 }}>Furvino Terms &amp; Conditions</Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>1. Definitions</Typography>
      <Typography>
        Owner: The operator and administrator of furvino.com.
      </Typography>
      <Typography>
        Website: furvino.com and all subdomains.
      </Typography>
      <Typography>
        User / You: Any person who accesses or uses the Website.
      </Typography>
      <Typography>
        Author: A person granted permission to upload visual novels (VNs) to the Website.
      </Typography>
      <Typography>
        TransIP: TransIP BV, a team.blue brand at transip.nl (VAT: NL812334966B01).
      </Typography>
      <Typography>
        Clerk: Clerk, Inc., available at clerk.com.
      </Typography>
      <Typography>
        VN / VNs: “Visual Novel(s)”.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>2. Nature of the Website</Typography>
      <Typography>
        The Website is strictly non-profit and generates no revenue.
      </Typography>
      <Typography>
        The Owner does not claim ownership over any VNs published here. Credit to authors is displayed on each VN page.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>3. Content Ownership &amp; Takedown Requests</Typography>
      <Typography>
        If your VN is uploaded without your permission, you may request its removal.
      </Typography>
      <Typography>
        The Owner will verify your ownership before taking action. Verification may require proof such as authorship statements, links to original publications, social media or official public user check (eg official VN Discord server owner). The Owner decides on the most suitable method of verification within reason.
      </Typography>
      <Typography>
        Verified takedown requests will be processed within 14 days. If verification is not possible, the Owner is not obliged to remove the content.
      </Typography>
      <Typography>
        All content uploaded by Authors is their sole responsibility. The Owner will remove any content found to be illegal or in violation of these Terms.
      </Typography>
      <Typography>
        The Owner will cooperate with lawful requests from Dutch or EU authorities.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>4. Legal Compliance</Typography>
      <Typography>
        The Website and its content are subject to:
      </Typography>
      <Typography>Dutch Penal Code (Wetboek van Strafrecht)</Typography>
      <Typography>Dutch Civil Code (Burgerlijk Wetboek)</Typography>
      <Typography>Dutch Copyright Act (Auteurswet)</Typography>
      <Typography>EU Digital Services Act (DSA)</Typography>
      <Typography>EU E-Commerce Directive (Article 14)</Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>5. Hosting &amp; Third-Party Services</Typography>
      <Typography>
        The Website and STACK storage are hosted in the Netherlands by TransIP, which is also subject to the laws listed above.
      </Typography>
      <Typography>
        User authentication is handled by Clerk. The Owner does not store your login credentials.
      </Typography>
      <Typography>
        Third parties such as TransIP and Clerk may process your personal data. Their privacy policies apply in addition to this one:
      </Typography>
      <Link href= "https://www.transip.nl/legal-and-security/privacy-policy/" target="_blank" rel="noopener">TransIP Privacy Policy</Link>  
      <Link href= "https://clerk.com/legal/privacy" target="_blank" rel="noopener">Clerk Privacy Policy</Link>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>6. Privacy &amp; Data Protection (GDPR/AVG)</Typography>
      <Typography>
        The Website processes personal data such as IP addresses, login information (via Clerk), and contact details you provide.
      </Typography>
      <Typography>The legal bases for processing are:</Typography>
      <Typography>Consent (e.g., optional cookies)</Typography>
      <Typography>Legitimate interest (site security, anti-abuse)</Typography>
      <Typography>Contract (providing VN upload and user accounts)</Typography>
      <Typography>
        Data is kept only as long as necessary for its purpose, after which it is deleted or anonymized.
      </Typography>
      <Typography>You have the right to:</Typography>
      <Typography>Access your data</Typography>
      <Typography>Request correction or deletion</Typography>
      <Typography>Withdraw consent</Typography>
      <Typography>Receive a copy of your data (data portability)</Typography>
      <Typography>
        To exercise these rights, contact:       <Link href="mailto:furvino.com@gmail.com" target="_blank" rel="noopener">furvino.com@gmail.com</Link>  
      </Typography>
      <Typography>
        The Website uses only essential cookies unless you give explicit consent for additional ones.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>7. Prohibited Uses</Typography>
      <Typography>You agree not to:</Typography>
      <Typography>Upload or distribute illegal, infringing, or harmful content.</Typography>
      <Typography>Attempt to bypass security or gain unauthorized access.</Typography>
      <Typography>Harass, threaten, or abuse other Users or Authors.</Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>8. Age Restriction</Typography>
      <Typography>
        The Website is intended for users aged 18 or older. You are responsible for complying with the age restrictions in your jurisdiction.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>9. Disclaimers &amp; Limitation of Liability</Typography>
      <Typography>
        The Website is provided “as is” without any warranty, express or implied.
      </Typography>
      <Typography>
        The Owner is not liable for any damages resulting from use of the Website, to the maximum extent permitted by law.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>10. Changes to These Terms</Typography>
      <Typography>
        The Owner may update these Terms from time to time. Updates will be posted on the Website, and continued use means you accept the changes.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>11. Governing Law &amp; Jurisdiction</Typography>
      <Typography>
        These Terms are governed by Dutch law. Any disputes will be resolved in the competent courts of the Netherlands.
      </Typography>

      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography sx={{ mt: 2 }}>
        If you agree to these Terms, please continue using the Website. If you do not, you must stop using it.
      </Typography>
        </Stack>
  );
}