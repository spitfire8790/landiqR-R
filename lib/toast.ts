import { useToast } from "@/components/ui/use-toast";

export type ToastVariant = "default" | "destructive";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export const createToastHelpers = () => {
  const { toast } = useToast();

  return {
    success: (title: string, description?: string) =>
      toast({ title, description, variant: "default" }),
    
    error: (title: string, description?: string) =>
      toast({ title, description, variant: "destructive" }),
    
    loading: (title: string, description?: string) =>
      toast({ title, description }),
    
    // Common patterns
    saveSuccess: (entityName: string = "Item") =>
      toast({ 
        title: "Success", 
        description: `${entityName} saved successfully` 
      }),
    
    saveError: (entityName: string = "Item") =>
      toast({ 
        title: "Error", 
        description: `Failed to save ${entityName}. Please try again.`,
        variant: "destructive"
      }),
    
    deleteSuccess: (entityName: string = "Item") =>
      toast({ 
        title: "Success", 
        description: `${entityName} deleted successfully` 
      }),
    
    deleteError: (entityName: string = "Item") =>
      toast({ 
        title: "Error", 
        description: `Failed to delete ${entityName}. Please try again.`,
        variant: "destructive"
      }),
    
    loadError: (entityName: string = "data") =>
      toast({ 
        title: "Error", 
        description: `Failed to load ${entityName}. Please refresh the page.`,
        variant: "destructive"
      }),

    exportSuccess: (format: string = "CSV") =>
      toast({ 
        title: "Export Started", 
        description: `${format} file will be downloaded shortly` 
      }),
    
    exportError: () =>
      toast({ 
        title: "Export Failed", 
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      }),
  };
};

// For use outside of React components (e.g., in service functions)
export const showToast = (options: ToastOptions) => {
  // This will need to be called from within a component context
  // or we need to implement a toast manager singleton
  console.warn("showToast called outside React context:", options);
}; 