// src/app/about/page.tsx
import { Typography, Stack, Link, Divider, Box } from "@mui/material";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Contact</Typography>
      <Typography>
        Do you have any questions, suggestions, want novels to be added or anything else? Below are a few different ways you can contact me. <br />
        Telegram:
        {" "}
        <Link href= "https://t.me/Trifumpy" target="_blank" rel="noopener">@Trifumpy</Link> <br />
      Discord:
      {" "}
      <Link href= "https://discord.com/users/216949212540174336" target="_blank" rel="noopener">@Trifumpy</Link>     
      </Typography>
      <Box mt={4} />
      <Typography>
        If you want to contact me on more serious matters like takedown requests, cooperation and more, please use the email below: <br />
        Email:
        {" "}
        <Link href="mailto:trifumpy@gmail.com" target="_blank" rel="noopener">trifumpy@gmail.com</Link>
      </Typography>
      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h4" sx={{ mt: 4 }}>About</Typography>
      <Typography>
        I want furries to discover and download all furry visual novels for free, with no ads, censorship as well as giving space for creators to publish their work without hassle for free and all in one place.
      </Typography>
      <Typography>
        My long term goal with this website is to create a platform where creators get a full amount from what you donated (excluding payment processing fees).
      </Typography>
      <Typography>
        Massive thank you to Ender for guidance, advice, setup and developing most of this website! 💙 <br />
      You can contact him on Discord here:
      {" "}
      <Link href= "https://discord.com/users/234625299625672704" target="_blank" rel="noopener">@enderfloof</Link>     
      </Typography>
      <Box mt={4} />
      <Divider sx={{ my: 3 }} />
      <Box mt={4} />
      <Typography variant="h4" sx={{ mt: 4 }}>Legal</Typography>
      <Typography variant="h6" sx={{ mt: 4 }}>Definitions</Typography>
      <Typography>
        Owner of Furvino.com will be reffered to as &quot;owner&quot;. <br />
        Furvino.com will be reffered to as &quot;website&quot;. <br />
        You, the person using this website will be reffered to as &quot;user&quot; or &quot;you&quot;.<br />
        Authors with the power to upload visual novels will be reffered to as &quot;authors&quot;. <br />
        TransIP BV, team.blue brand at <Link href= "https://www.transip.nl/" target="_blank" rel="noopener">transip.nl</Link> with VAT:NL812334966B01, will be reffered to as &quot;Transip&quot; <br /> 
        Clerk, Inc. at <Link href= "https://clerk.com/" target="_blank" rel="noopener">clerk.com</Link> will be reffered to as &quot;Clerk&quot;
        Visual Novels will be refferd to as &quot;VN&quot; or &quot;VNs&quot; for plural.
      </Typography>
      <Box mt={4} />      
      <Box mt={4} />
      <Typography variant="h6" sx={{ mt: 4 }}>Terms and Conditions</Typography>
      <Typography>
        1) This Website does not generate any revenue. It is stricly a non-profit website. <br />
        2) The Owner doesn&apos;t own any VNs published here. Credit to the authors of the VNs is on the VN pages.
        </Typography>
        <Typography>
        3) If You wish to takedown your VN uploaded by the Owner because of a request for it to be uploaded, the Owner have to verify User&apos;s true ownership of the VN in question. Any takedown requests will be treated seriously and within reasonable time. The Owner will do their best to accomodate your request. If the Owner cannot verify you as the owner of the VN, the Owner is not obliged to take down the VN. <br />
        </Typography>
        <Typography>
        4) The Owner is not responsible for any content uploaded by the Authors. If the Author uploads any illegal conent they will be held responsible and the Owner will remove the content uploaded. Any content uploaded by the Owner is verified to have the correct license for free public redistribution. <br />
        4a) The content and the Website is subject to: <br />
        Dutch Penal Code (Wetboek van Strafrecht) <br />
        Dutch Civil Code (Burgerlijk Wetboek) <br />
        Dutch Copyright Act (Auterswet) <br />
        EU&apos;s Digital Services Act (DSA) <br />
        EU&apos;s E-Commerce Directive (Article 14)
        </Typography>
        <Typography>
        5) This Website and STACK storage is hosted in the Netherlands by TransIP. They are also subject to the addition &quot;4a)&quot;. Any questions about their products can be found on their website.
      </Typography>
      <Typography>
        6) User login information including passwords is handled by Clerk. We do not store any of your login credentials.
      </Typography>
      <Typography>
        7) This is a test if the actions work correctly. If you are reading this, it means that the actions work correctly.
      </Typography>
      <Typography>
        8) By using this website, the User agrees that they are of age 18 or older.
      </Typography>
        </Stack>
  );
}