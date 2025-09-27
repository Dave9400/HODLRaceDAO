import NavigationHub from '../NavigationHub'

export default function NavigationHubExample() {
  return <NavigationHub onNavigate={(page) => console.log('Navigate to:', page)} />
}