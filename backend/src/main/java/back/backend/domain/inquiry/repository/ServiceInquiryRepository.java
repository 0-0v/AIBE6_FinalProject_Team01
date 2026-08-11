package back.backend.domain.inquiry.repository;

import back.backend.domain.inquiry.entity.InquiryStatus;
import back.backend.domain.inquiry.entity.ServiceInquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceInquiryRepository extends JpaRepository<ServiceInquiry, Long> {
    Page<ServiceInquiry> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);
    Page<ServiceInquiry> findAllByStatusOrderByCreatedAtDescIdDesc(InquiryStatus status, Pageable pageable);
}
