export interface AboutSection {
  title: string;
  content: string;
  image?: string;
  /**
   * One word, set very large and very pale behind the chapter's text panel,
   * bleeding out into the empty margin beside it.
   *
   * A vertical version of the chapter title was tried in that margin and
   * taken out — at a readable size it looked like stray text. A single word
   * works where the label did not, because at 8rem it stops being a caption
   * and becomes part of the composition. Keep them short: anything past about
   * nine characters runs out of margin.
   */
  keyword?: string;
}

export const aboutContent: AboutSection[] = [
  {
    title: "Our Journey of Handcrafted Story",
    keyword: "Origins",
    content: "For centuries, the art of textile making has been woven into the very fabric of our culture. What began in humble homes with simple looms has evolved into a rich tradition that connects us to our ancestors. Every thread tells a story of dedication, skill, and the timeless beauty of handcrafted goods.",
    image: "/assets/images/about/a6.jpg"
  },
  {
    title: "The Traditional Craft",
    keyword: "Craft",
    content: "In the early morning hours, when the world is still quiet, our artisans begin their work. Using techniques passed down through generations, they transform simple cotton and linen into beautiful, functional pieces. The rhythmic sound of the loom, the careful selection of threads, and the patient process of weaving create textiles that are not just products, but pieces of living history.",
    image: "/assets/images/about/a2.jpg"
  },
  {
    title: "Home-Made Excellence",
    keyword: "Home",
    content: "Our marketplace celebrates the beauty of home-made products. Each towel, apron, and textile piece is crafted in small workshops and family homes where quality takes precedence over quantity. These aren't mass-produced items – they're lovingly made pieces that carry the warmth and care of human hands.",
    // Was a3.png, a 1200x600 PNG weighing 1385KB for a photograph. Same
    // pixels as webp: 83KB, a 94% saving.
    image: "/assets/images/about/a3.webp"
  },
  {
    title: "Preserving Tradition",
    keyword: "Heritage",
    content: "In a world of fast fashion and machine production, we stand as guardians of traditional textile arts. Our vendors are not just suppliers – they are keepers of ancient knowledge, master craftspeople who ensure that the skills of their ancestors continue to flourish in the modern world.",
    image: "/assets/images/about/a4.jpg"
  },
  {
    title: "The Future of Handcraft",
    keyword: "Future",
    content: "While we honor our past, we also embrace the future. Our artisans are incorporating sustainable materials and eco-friendly practices into their traditional methods. This fusion of old wisdom and new consciousness creates textiles that are not only beautiful and functional but also kind to our planet.",
    image: "/assets/images/about/a5.jpg"
  }
];

/**
 * The banner at the top of /about.
 *
 * Placeholder wording — it says what the business model appears to be from the
 * mission statement and the seller/maker panels on the homepage. Swap the
 * three strings for the real positioning line; nothing else needs touching.
 *
 * The image is a resized, re-encoded a8.webp (2500x1668, 586KB → 2200x1468,
 * 280KB). It has to be a plain URL rather than a next/image import because the
 * banner paints it across sixteen separate strips, each one a CSS background.
 */
export const aboutBanner = {
  eyebrow: 'Maker to customer',
  title: 'Straight from the loom.',
  subtitle:
    'A marketplace for home textiles bought direct from the workshops that weave them — so the price reflects the cloth, not the chain of hands it passed through.',
  ctaLabel: 'Shop the collection',
  ctaHref: '/products',
  image: '/assets/images/about/banner-loom.webp',
  imageAlt: 'A weaver drawing warp threads across a handloom in a workshop',
};

export const missionStatement = {
  title: "Our Mission",
  /**
   * The statement, split at its own sentence break. It was one 57-word block
   * set at heading size, which is a wall rather than a statement — the first
   * sentence is the claim and the second is the reasoning, so they are set at
   * different sizes instead of the same one.
   *
   * `content` is kept whole and unused by the page, in case anything else
   * ever wants the full paragraph.
   */
  lead: "To connect conscious consumers with authentic, handcrafted textiles while supporting traditional artisans and preserving cultural heritage.",
  support: "We believe that every purchase should tell a story, support a family, and contribute to keeping ancient crafts alive for future generations.",
  content: "To connect conscious consumers with authentic, handcrafted textiles while supporting traditional artisans and preserving cultural heritage. We believe that every purchase should tell a story, support a family, and contribute to keeping ancient crafts alive for future generations.",
  /**
   * A 4:5 crop of a7.webp, which was sitting unused in this folder and is the
   * best photograph in it. Contained and portrait — deliberately nothing like
   * the banner's full-bleed landscape, so the two do not read as the same
   * device twice. 251KB → 72KB.
   */
  image: "/assets/images/about/mission-weaver.webp",
  imageAlt: "A weaver at her loom, seen through the warp threads",
};

export const values = [
  {
    title: "Authenticity",
    description: "Every product is genuinely handcrafted using traditional methods"
  },
  {
    title: "Quality",
    description: "We maintain the highest standards in materials and craftsmanship"
  },
  {
    title: "Sustainability",
    description: "Supporting eco-friendly practices and sustainable livelihoods"
  },
  {
    title: "Heritage",
    description: "Preserving and celebrating traditional textile arts"
  },
  {
    title: "Community",
    description: "Building connections between artisans and conscious consumers"
  }
];