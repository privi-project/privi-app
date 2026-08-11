import React from 'react';
import { SvgProps } from 'react-native-svg';

import Automotive from '../../assets/brand/category-icons/automotive.svg';
import BeautyAndPersonalCare from '../../assets/brand/category-icons/beauty-and-personal-care.svg';
import EducationAndSkills from '../../assets/brand/category-icons/education-and-skills.svg';
import Experiences from '../../assets/brand/category-icons/experiences.svg';
import FamilyAndChildren from '../../assets/brand/category-icons/family-and-children.svg';
import FoodAndDrink from '../../assets/brand/category-icons/food-and-drink.svg';
import HealthAndFitness from '../../assets/brand/category-icons/health-and-fitness.svg';
import HomeAndLifestyle from '../../assets/brand/category-icons/home-and-lifestyle.svg';
import LeisureAndEntertainment from '../../assets/brand/category-icons/leisure-and-entertainment.svg';
import PetServices from '../../assets/brand/category-icons/pet-services.svg';
import ProfessionalAndEverydayServices from '../../assets/brand/category-icons/professional-and-everyday-services.svg';
import Retail from '../../assets/brand/category-icons/retail.svg';
import TravelAndAccommodation from '../../assets/brand/category-icons/travel-and-accommodation.svg';

const ICONS: Record<string, React.FC<SvgProps>> = {
  automotive: Automotive,
  'beauty-and-personal-care': BeautyAndPersonalCare,
  'education-and-skills': EducationAndSkills,
  experiences: Experiences,
  'family-and-children': FamilyAndChildren,
  'food-and-drink': FoodAndDrink,
  'health-and-fitness': HealthAndFitness,
  'home-and-lifestyle': HomeAndLifestyle,
  'leisure-and-entertainment': LeisureAndEntertainment,
  'pet-services': PetServices,
  'professional-and-everyday-services': ProfessionalAndEverydayServices,
  retail: Retail,
  'travel-and-accommodation': TravelAndAccommodation,
};

interface CategoryIconProps extends SvgProps {
  slug: string;
}

export function CategoryIcon({ slug, ...props }: CategoryIconProps) {
  const Icon = ICONS[slug] ?? Retail;
  return <Icon {...props} />;
}
